import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { requirePermission } from "@/modules/auth/application/authorization";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { listAuditActions, listAuditLog } from "@/modules/audit/application/audit-log";
import { AuthorizationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let viewer: TestAccount;
let actorId: string;
const created = { accountIds: [] as string[] };

beforeEach(async () => {
  vi.mocked(requirePermission).mockResolvedValue(undefined);

  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const makeAccount = async (label: string) => {
    const record = await prisma.account.create({
      data: {
        accountType: "EMPLOYEE",
        status: "ACTIVE",
        email: `vitest-audit-${label}-${suffix}@example.com`,
        phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
        passwordHash: "test-hash",
        employeeProfile: {
          create: {
            employeeNumber: `VITAUD-${label}-${suffix.toUpperCase()}`,
            departmentId: department.id,
            firstName: "Vitest",
            lastName: label === "viewer" ? "Viewer" : "Actor",
          },
        },
      },
      include: { employeeProfile: true },
    });
    created.accountIds.push(record.id);

    return record;
  };

  const viewerRecord = await makeAccount("viewer");
  const actorRecord = await makeAccount("actor");
  actorId = actorRecord.id;

  viewer = {
    id: viewerRecord.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: viewerRecord.email,
    phone: viewerRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: viewerRecord.createdAt,
    updatedAt: viewerRecord.updatedAt,
    employeeProfile: { id: viewerRecord.employeeProfile!.id },
  } as TestAccount;

  // Start every test from a clean marker so counts are deterministic.
  await prisma.auditLog.deleteMany({ where: { action: "VIT_AUDIT_MARKER" } });

  // A distinctive action so the assertions never depend on other rows.
  await prisma.auditLog.create({
    data: { accountId: actorId, action: "VIT_AUDIT_MARKER", entity: "Vitest", entityId: "marker-1" },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { OR: [{ accountId: { in: created.accountIds } }, { action: "VIT_AUDIT_MARKER" }] } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("listAuditLog", () => {
  it("returns the newest entry first with the acting account resolved", async () => {
    const page = await listAuditLog(viewer, { limit: 5, offset: 0 }, { action: "VIT_AUDIT_MARKER" });

    expect(page.pagination.total).toBe(1);
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0].action).toBe("VIT_AUDIT_MARKER");
    expect(page.rows[0].actorName).toContain("Vitest");
    expect(page.rows[0].entityId).toBe("marker-1");
  });

  it("filters by action and paginates", async () => {
    for (let index = 0; index < 3; index += 1) {
      await prisma.auditLog.create({
        data: { accountId: actorId, action: "VIT_AUDIT_MARKER", entity: "Vitest", entityId: `extra-${index}` },
      });
    }

    const first = await listAuditLog(viewer, { limit: 2, offset: 0 }, { action: "VIT_AUDIT_MARKER" });
    expect(first.pagination.total).toBe(4);
    expect(first.rows).toHaveLength(2);

    const second = await listAuditLog(viewer, { limit: 2, offset: 2 }, { action: "VIT_AUDIT_MARKER" });
    expect(second.rows).toHaveLength(2);

    const other = await listAuditLog(viewer, { limit: 5, offset: 0 }, { action: "NOT_A_REAL_ACTION" });
    expect(other.pagination.total).toBe(0);
  });

  it("caps the page size and reports the distinct actions", async () => {
    const page = await listAuditLog(viewer, { limit: 5000, offset: 0 });
    expect(page.pagination.limit).toBe(100);

    const actions = await listAuditActions(viewer);
    expect(actions).toContain("VIT_AUDIT_MARKER");
  });

  it("stops before reading anything when the permission is missing", async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(new AuthorizationError("Missing audit.view."));

    await expect(listAuditLog(viewer, { limit: 5, offset: 0 })).rejects.toMatchObject({ statusCode: 403 });
    expect(vi.mocked(requirePermission)).toHaveBeenCalledWith("audit.view");
  });
});
