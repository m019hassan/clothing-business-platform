import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  getCustomer,
  listCustomers,
  parseCustomerListFilters,
} from "@/modules/customers/application/customers";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

const account = { id: "00000000-0000-4000-8000-00000000cafe", accountType: "EMPLOYEE" } as TestAccount;

let fixture: { profileId: string; customerCode: string; firstName: string };
const created = { accountIds: [] as string[], profileIds: [] as string[] };

beforeEach(async () => {
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const main = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-cust-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "hash-must-never-leak",
      customerProfile: {
        create: {
          customerCode: `VITCUST-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Nour",
          lastName: "Hassan",
          gender: "FEMALE",
          birthDate: new Date("1992-03-15T00:00:00.000Z"),
        },
      },
    },
    include: { customerProfile: true },
  });
  const quietAccount = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-quiet-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "hash",
      customerProfile: {
        create: {
          customerCode: `VITQUIET-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Zzz",
          lastName: "Quiet",
        },
      },
    },
    include: { customerProfile: true },
  });

  created.accountIds.push(main.id, quietAccount.id);
  created.profileIds.push(main.customerProfile!.id, quietAccount.customerProfile!.id);

  // one order for the main customer
  await prisma.order.create({
    data: {
      orderNumber: `ORD-VIT-${suffix.toUpperCase()}`,
      customerProfileId: main.customerProfile!.id,
      status: "DRAFT",
      subtotalAmount: new Prisma.Decimal("250.00"),
      totalAmount: new Prisma.Decimal("250.00"),
      currency: "SAR",
    },
  });

  fixture = {
    profileId: main.customerProfile!.id,
    customerCode: main.customerProfile!.customerCode,
    firstName: "Nour",
  };
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { customerProfileId: { in: created.profileIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("parseCustomerListFilters", () => {
  it("accepts a trimmed search and rejects blank or oversized ones", () => {
    expect(parseCustomerListFilters(new URLSearchParams())).toEqual({});
    expect(parseCustomerListFilters(new URLSearchParams({ q: "  Nour " }))).toEqual({ search: "Nour" });
    expect(() => parseCustomerListFilters(new URLSearchParams({ q: "   " }))).toThrowError();
    expect(() => parseCustomerListFilters(new URLSearchParams({ q: "x".repeat(101) }))).toThrowError();
  });
});

describe("listCustomers", () => {
  it("returns rows with status, classification and order counts", async () => {
    const page = await listCustomers(account, { limit: 100, offset: 0 }, { search: fixture.customerCode });

    expect(page.pagination.total).toBe(1);
    expect(page.customers).toHaveLength(1);

    const row = page.customers[0];
    expect(row.customerCode).toBe(fixture.customerCode);
    expect(row.firstName).toBe("Nour");
    expect(row.accountStatus).toBe("ACTIVE");
    expect(row.classificationName).toBe("Retail");
    expect(row.orderCount).toBe(1);
    expect(JSON.stringify(row)).not.toMatch(/passwordHash|hash-must-never-leak/);
  });

  it("searches by name, email and phone", async () => {
    const byName = await listCustomers(account, { limit: 100, offset: 0 }, { search: "Nour" });
    expect(byName.customers.map((row) => row.customerCode)).toContain(fixture.customerCode);

    const byEmail = await listCustomers(account, { limit: 100, offset: 0 }, { search: "vitest-quiet-" });
    expect(byEmail.pagination.total).toBeGreaterThanOrEqual(1);
    expect(byEmail.customers.every((row) => row.customerCode.startsWith("VITQUIET"))).toBe(true);
  });

  it("paginates without changing the total", async () => {
    const first = await listCustomers(account, { limit: 1, offset: 0 });
    const second = await listCustomers(account, { limit: 1, offset: 1 });

    expect(first.customers).toHaveLength(1);
    expect(second.customers).toHaveLength(1);
    expect(first.pagination.total).toBe(second.pagination.total);
    expect(first.customers[0].id).not.toBe(second.customers[0].id);
  });
});

describe("getCustomer", () => {
  it("returns the profile with recent orders and no sensitive fields", async () => {
    const detail = await getCustomer(account, fixture.profileId);

    expect(detail.firstName).toBe("Nour");
    expect(detail.gender).toBe("FEMALE");
    expect(detail.birthDate).toBe("1992-03-15");
    expect(detail.orderCount).toBe(1);
    expect(detail.recentOrders).toHaveLength(1);
    expect(detail.recentOrders[0].status).toBe("DRAFT");
    expect(JSON.stringify(detail)).not.toMatch(/passwordHash|hash-must-never-leak/);
  });

  it("rejects unknown and malformed ids", async () => {
    await expect(
      getCustomer(account, "00000000-0000-4000-8000-000000000000"),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(getCustomer(account, "not-a-uuid")).rejects.toMatchObject({ statusCode: 404 });
  });
});
