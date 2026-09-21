import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { login } from "@/modules/auth/application/login";
import { prisma } from "@/src/lib/db";
import { __resetStub, __setHeader } from "@/tests/stubs/next-headers";

const PASSWORD = "Correct12345!";
const created = { accountIds: [] as string[], profileIds: [] as string[] };

let account: { id: string; email: string };
let attempt = 0;

beforeEach(async () => {
  __resetStub();

  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const suffix = `${Date.now().toString(36)}-${Math.floor(Math.random() * 100000)}-${attempt}`;

  const record = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-limit-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      customerProfile: {
        create: {
          customerCode: `VITLIM-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Limit",
        },
      },
    },
    include: { customerProfile: true },
  });

  created.accountIds.push(record.id);
  created.profileIds.push(record.customerProfile!.id);
  account = { id: record.id, email: record.email as string };
});

afterAll(async () => {
  await prisma.session.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

/** Each test gets its own client bucket so the IP window stays isolated. */
function useClient(ip: string) {
  attempt += 1;
  __setHeader("x-forwarded-for", ip);
  __setHeader("user-agent", "vitest");
}

describe("login rate limiting", () => {
  it("blocks an identifier after five failed attempts with 429", async () => {
    useClient(`203.0.113.${attempt}`);

    for (let index = 0; index < 5; index += 1) {
      await expect(login({ identifier: account.email, password: "wrong-password" })).rejects.toMatchObject({
        statusCode: 401,
      });
    }

    await expect(login({ identifier: account.email, password: PASSWORD })).rejects.toMatchObject({
      statusCode: 429,
      code: "RATE_LIMITED",
    });

    // The correct password is not even evaluated while the window is closed.
    const sessions = await prisma.session.count({ where: { accountId: account.id } });
    expect(sessions).toBe(0);
  });

  it("keeps other identifiers unaffected", async () => {
    useClient(`203.0.114.${attempt}`);

    for (let index = 0; index < 5; index += 1) {
      await expect(login({ identifier: account.email, password: "wrong-password" })).rejects.toMatchObject({
        statusCode: 401,
      });
    }

    const classification = await prisma.customerClassification.findFirstOrThrow({ where: { code: "RETAIL" } });
    const suffix = `${Date.now().toString(36)}-${Math.floor(Math.random() * 100000)}`;
    const other = await prisma.account.create({
      data: {
        accountType: "CUSTOMER",
        status: "ACTIVE",
        email: `vitest-limit-other-${suffix}@example.com`,
        phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
        passwordHash: await bcrypt.hash(PASSWORD, 4),
        customerProfile: {
          create: {
            customerCode: `VITLIMB-${suffix.toUpperCase()}`,
            classificationId: classification.id,
            firstName: "Other",
            lastName: "Limit",
          },
        },
      },
      include: { customerProfile: true },
    });
    created.accountIds.push(other.id);
    created.profileIds.push(other.customerProfile!.id);

    await expect(login({ identifier: other.email as string, password: PASSWORD })).resolves.toBeUndefined();

    const sessions = await prisma.session.count({ where: { accountId: other.id } });
    expect(sessions).toBe(1);
  });

  it("clears the identifier window after a successful sign-in", async () => {
    useClient(`203.0.115.${attempt}`);

    for (let index = 0; index < 3; index += 1) {
      await expect(login({ identifier: account.email, password: "wrong-password" })).rejects.toMatchObject({
        statusCode: 401,
      });
    }

    await expect(login({ identifier: account.email, password: PASSWORD })).resolves.toBeUndefined();

    // Five fresh failures are allowed again (the window restarted) and the sixth is blocked.
    for (let index = 0; index < 5; index += 1) {
      await expect(login({ identifier: account.email, password: "wrong-password" })).rejects.toMatchObject({
        statusCode: 401,
      });
    }

    await expect(login({ identifier: account.email, password: PASSWORD })).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it("limits a single client across many identifiers", async () => {
    const ip = `203.0.116.${attempt}`;
    useClient(ip);

    for (let index = 0; index < 20; index += 1) {
      await expect(
        login({ identifier: `unknown-${index}-${Date.now()}@example.com`, password: "whatever" }),
      ).rejects.toMatchObject({ statusCode: 401 });
    }

    await expect(login({ identifier: account.email, password: PASSWORD })).rejects.toMatchObject({
      statusCode: 429,
    });
  });
});
