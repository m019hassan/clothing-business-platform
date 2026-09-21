import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  getCustomerProfile,
  parseCustomerProfileWriteInput,
  updateCustomerProfile,
} from "@/modules/customers/application/profile";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let customer: TestAccount;
let employee: TestAccount;
const created = { accountIds: [] as string[], profileIds: [] as string[] };

beforeEach(async () => {
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const customerRecord = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-profile-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `VITPRF-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Profile",
        },
      },
    },
    include: { customerProfile: true },
  });
  const employeeRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-profile-e-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITPRF-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Staff",
        },
      },
    },
  });

  created.accountIds.push(customerRecord.id, employeeRecord.id);
  created.profileIds.push(customerRecord.customerProfile!.id);

  customer = {
    id: customerRecord.id,
    accountType: "CUSTOMER",
    status: "ACTIVE",
    email: customerRecord.email,
    phone: customerRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: customerRecord.createdAt,
    updatedAt: customerRecord.updatedAt,
    customerProfile: { id: customerRecord.customerProfile!.id },
  } as TestAccount;

  employee = {
    id: employeeRecord.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: employeeRecord.email,
    phone: employeeRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: employeeRecord.createdAt,
    updatedAt: employeeRecord.updatedAt,
    employeeProfile: { id: "00000000-0000-4000-8000-000000000000" },
  } as TestAccount;
});

afterAll(async () => {
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("parseCustomerProfileWriteInput", () => {
  it("normalises names and clears empty optional fields", () => {
    expect(
      parseCustomerProfileWriteInput(
        { firstName: "  Ahmed ", lastName: "  ", gender: "MALE", birthDate: "1990-05-04" },
        { partial: true },
      ),
    ).toEqual({ firstName: "Ahmed", lastName: null, gender: "MALE", birthDate: new Date("1990-05-04T00:00:00.000Z") });
  });

  it("rejects unknown keys, bad genders and future or malformed dates", () => {
    expect(() => parseCustomerProfileWriteInput({ nickname: "x" }, { partial: true })).toThrowError();
    expect(() => parseCustomerProfileWriteInput({ gender: "ROBOT" }, { partial: true })).toThrowError();
    expect(() => parseCustomerProfileWriteInput({ birthDate: "04/05/1990" }, { partial: true })).toThrowError();
    expect(() => parseCustomerProfileWriteInput({ birthDate: "2999-01-01" }, { partial: true })).toThrowError();
    expect(() => parseCustomerProfileWriteInput({ birthDate: "1990-02-31" }, { partial: true })).toThrowError();
    expect(() => parseCustomerProfileWriteInput({ birthDate: "1899-12-31" }, { partial: true })).toThrowError();
    expect(() => parseCustomerProfileWriteInput({}, { partial: true })).toThrowError();
  });
});

describe("updateCustomerProfile", () => {
  it("persists profile fields and reads them back", async () => {
    const before = await getCustomerProfile(customer);
    expect(before.firstName).toBe("Vitest");

    const updated = await updateCustomerProfile(customer, {
      firstName: "Ahmed",
      lastName: "Ali",
      gender: "MALE",
      birthDate: "1990-05-04",
    });

    expect(updated).toMatchObject({
      firstName: "Ahmed",
      lastName: "Ali",
      gender: "MALE",
      birthDate: "1990-05-04",
    });
    expect(updated.customerCode).toBe(before.customerCode);

    const reread = await getCustomerProfile(customer);
    expect(reread).toEqual(updated);
  });

  it("clears optional fields when null is provided", async () => {
    await updateCustomerProfile(customer, { lastName: "Ali", gender: "FEMALE", birthDate: "1985-01-01" });

    const cleared = await updateCustomerProfile(customer, { lastName: null, gender: null, birthDate: null });

    expect(cleared.lastName).toBeNull();
    expect(cleared.gender).toBeNull();
    expect(cleared.birthDate).toBeNull();
  });

  it("rejects invalid payloads with 400", async () => {
    await expect(updateCustomerProfile(customer, { firstName: "   " })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(updateCustomerProfile(customer, { birthDate: "2999-01-01" })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("refuses employee accounts with 403", async () => {
    await expect(getCustomerProfile(employee)).rejects.toMatchObject({ statusCode: 403 });
    await expect(updateCustomerProfile(employee, { firstName: "Nope" })).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
