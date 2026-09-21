import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notification/application/notifications";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let accountA: TestAccount;
let accountB: TestAccount;
const created = { accountIds: [] as string[], profileIds: [] as string[] };

async function createCustomer(label: string) {
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));

  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  return prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-notif-${label}-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `VITN-${label.toUpperCase()}-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: label,
        },
      },
    },
    include: { customerProfile: true },
  });
}

function toAccount(record: Awaited<ReturnType<typeof createCustomer>>): TestAccount {
  return {
    id: record.id,
    accountType: "CUSTOMER",
    status: "ACTIVE",
    email: record.email,
    phone: record.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    customerProfile: { id: record.customerProfile!.id },
  } as TestAccount;
}

beforeEach(async () => {
  const a = await createCustomer("a");
  const b = await createCustomer("b");
  accountA = toAccount(a);
  accountB = toAccount(b);
  created.accountIds.push(a.id, b.id);
  created.profileIds.push(a.customerProfile!.id, b.customerProfile!.id);

  await prisma.notification.createMany({
    data: [
      { accountId: a.id, type: "ORDER", title: "Order placed", body: "Your order was created.", entityType: "Order", entityId: "order-1", readAt: new Date() },
      { accountId: a.id, type: "ORDER", title: "Order confirmed", entityType: "Order", entityId: "order-2" },
      { accountId: a.id, type: "PAYMENT", title: "Payment approved", entityId: "payment-1" },
      { accountId: b.id, type: "ORDER", title: "Other customer order" },
    ],
  });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.notificationPreference.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("listNotifications", () => {
  it("scopes rows to the account and reports the unread count", async () => {
    const page = await listNotifications(accountA, { limit: 50, offset: 0 });

    expect(page.pagination.total).toBe(3);
    expect(page.notifications).toHaveLength(3);
    expect(page.unreadCount).toBe(2);
    expect(page.notifications.every((notification) => notification.title !== "Other customer order")).toBe(true);
  });

  it("orders newest first", async () => {
    const page = await listNotifications(accountA, { limit: 50, offset: 0 });
    const timestamps = page.notifications.map((notification) => Date.parse(notification.createdAt));

    expect([...timestamps].sort((left, right) => right - left)).toEqual(timestamps);
  });

  it("paginates without changing the total", async () => {
    const first = await listNotifications(accountA, { limit: 2, offset: 0 });
    const second = await listNotifications(accountA, { limit: 2, offset: 2 });

    expect(first.notifications).toHaveLength(2);
    expect(second.notifications).toHaveLength(1);
    expect(first.pagination.total).toBe(3);
    expect(second.pagination.total).toBe(3);
    expect(first.notifications[0].id).not.toBe(second.notifications[0].id);
  });

  it("never reports another account's rows (404 semantics on foreign ids)", async () => {
    const foreign = await prisma.notification.findFirstOrThrow({ where: { accountId: accountB.id } });

    await expect(markNotificationRead(accountA, foreign.id)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("getUnreadNotificationCount", () => {
  it("counts only unread rows of the account", async () => {
    expect(await getUnreadNotificationCount(accountA)).toBe(2);
    expect(await getUnreadNotificationCount(accountB)).toBe(1);
  });
});

describe("markNotificationRead", () => {
  it("marks a row as read and is idempotent", async () => {
    const page = await listNotifications(accountA, { limit: 50, offset: 0 });
    const unread = page.notifications.find((notification) => notification.readAt === null)!;

    const updated = await markNotificationRead(accountA, unread.id);
    expect(updated.readAt).not.toBeNull();

    const again = await markNotificationRead(accountA, unread.id);
    expect(again.readAt).toBe(updated.readAt);
    expect(await getUnreadNotificationCount(accountA)).toBe(1);
  });

  it("rejects unknown ids", async () => {
    await expect(
      markNotificationRead(accountA, "00000000-0000-0000-0000-000000000000"),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(markNotificationRead(accountA, "not-a-uuid")).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("markAllNotificationsRead", () => {
  it("marks every unread row of the account only", async () => {
    const updated = await markAllNotificationsRead(accountA);

    expect(updated).toBe(2);
    expect(await getUnreadNotificationCount(accountA)).toBe(0);
    expect(await getUnreadNotificationCount(accountB)).toBe(1);
  });

  it("returns zero when there is nothing left to mark", async () => {
    await markAllNotificationsRead(accountA);

    expect(await markAllNotificationsRead(accountA)).toBe(0);
  });
});
