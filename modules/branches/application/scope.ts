import "server-only";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { prisma } from "@/src/lib/db";
import { withDatabaseError } from "@/src/lib/errors";

type AuthenticatedAccount = NonNullable<SafeAccount>;

export type BranchScope = {
  /** null means "no branch restriction" (head office / unassigned staff). */
  branchId: string | null;
  /** null means every warehouse; an empty array means the branch has none. */
  warehouseIds: string[] | null;
  branchLabel: string | null;
};

export const GLOBAL_BRANCH_SCOPE: BranchScope = {
  branchId: null,
  warehouseIds: null,
  branchLabel: null,
};

/**
 * Branch of the signed-in account. Employees and distributors carry their branch
 * on their profile; accounts without one (administration, head office) keep the
 * global view, which is the documented rule.
 */
export async function resolveBranchScope(account: AuthenticatedAccount): Promise<BranchScope> {
  const branchId = account.employeeProfile?.branchId ?? account.distributorProfile?.branchId ?? null;

  if (!branchId) {
    return GLOBAL_BRANCH_SCOPE;
  }

  return withDatabaseError(async () => {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, code: true, name: true },
    });

    if (!branch) {
      return GLOBAL_BRANCH_SCOPE;
    }

    const warehouses = await prisma.warehouse.findMany({
      where: { branchId: branch.id },
      select: { id: true },
    });

    return {
      branchId: branch.id,
      warehouseIds: warehouses.map((warehouse) => warehouse.id),
      branchLabel: `${branch.name} (${branch.code})`,
    };
  });
}

/** Convenience guard used by the pages to describe the active scope. */
export function scopeDescription(scope: BranchScope): string {
  return scope.branchId ? `Branch: ${scope.branchLabel}` : "All branches";
}
