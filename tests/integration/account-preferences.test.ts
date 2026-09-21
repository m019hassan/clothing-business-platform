import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  getAccountPreferences,
  getNotificationPreferences,
  updateAccountPreferences,
  updateNotificationPreference,
} from "@/modules/notification/application/notifications";
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
      email: `vitest-pref-c-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      preferredLanguage: "ar",
      timezone: "Asia/Riyadh",
      customerProfile: {
        create: {
          customerCode: `VITPREF-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Pref",
          marketingConsent: false,
        },
      },
    },
    include: { customerProfile: true },
  });
  const employeeRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-pref-e-${suffix}@example.com`,
      phone: `+9665${Math.floor(20000000 + Math.random() * 8999999)}`,
      passwordHash: "test-hash",
      preferredLanguage: "ar",
      timezone: "Asia/Riyadh",
      employeeProfile: {
        create: {
          employeeNumber: `VITPREF-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Staff",
        },
      },
    },
    include: { employeeProfile: true },
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
    employeeProfile: { id: employeeRecord.employeeProfile!.id },
  } as TestAccount;
});

afterAll(async () => {
  await prisma.notificationPreference.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.notification.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("getAccountPreferences", () => {
  it("returns language, timezone and marketing consent", async () => {
    const preferences = await getAccountPreferences(customer);

    expect(preferences).toEqual({
      preferredLanguage: "ar",
      timezone: "Asia/Riyadh",
      marketingConsent: false,
    });
  });

  it("reports null marketing consent for employee accounts", async () => {
    const preferences = await getAccountPreferences(employee);

    expect(preferences.marketingConsent).toBeNull();
  });
});

describe("updateAccountPreferences", () => {
  it("persists language, timezone and consent", async () => {
    const updated = await updateAccountPreferences(customer, {
      preferredLanguage: "en",
      timezone: "Europe/London",
      marketingConsent: true,
    });

    expect(updated).toEqual({
      preferredLanguage: "en",
      timezone: "Europe/London",
      marketingConsent: true,
    });

    const reread = await getAccountPreferences(customer);
    expect(reread).toEqual(updated);
  });

  it("accepts a partial update", async () => {
    const updated = await updateAccountPreferences(customer, { preferredLanguage: "en" });

    expect(updated.preferredLanguage).toBe("en");
    expect(updated.timezone).toBe("Asia/Riyadh");
  });

  it("rejects an unsupported language", async () => {
    await expect(
      updateAccountPreferences(customer, { preferredLanguage: "fr" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects an invalid IANA timezone", async () => {
    await expect(
      updateAccountPreferences(customer, { timezone: "Mars/Olympus" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects a non-boolean marketing consent", async () => {
    await expect(
      updateAccountPreferences(customer, { marketingConsent: "yes" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects marketing consent for employee accounts", async () => {
    await expect(
      updateAccountPreferences(employee, { marketingConsent: true }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects an empty payload", async () => {
    await expect(updateAccountPreferences(customer, {})).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("notification preferences", () => {
  it("defaults every type to in-app on", async () => {
    const preferences = await getNotificationPreferences(customer);

    expect(preferences.map((preference) => preference.type).sort()).toEqual(["ORDER", "PAYMENT"]);
    expect(preferences.every((preference) => preference.inApp)).toBe(true);
  });

  it("upserts a single type and keeps the others", async () => {
    await updateNotificationPreference(customer, "ORDER", false);

    const preferences = await getNotificationPreferences(customer);
    const order = preferences.find((preference) => preference.type === "ORDER");
    const payment = preferences.find((preference) => preference.type === "PAYMENT");

    expect(order?.inApp).toBe(false);
    expect(payment?.inApp).toBe(true);

    await updateNotificationPreference(customer, "ORDER", true);
    const restored = await getNotificationPreferences(customer);
    expect(restored.find((preference) => preference.type === "ORDER")?.inApp).toBe(true);
  });

  it("rejects an unknown type and a non-boolean flag", async () => {
    await expect(
      updateNotificationPreference(customer, "SYSTEM", true),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      updateNotificationPreference(customer, "ORDER", "on" as unknown as boolean),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
