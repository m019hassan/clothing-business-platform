import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getBranch } from "@/modules/branches/application/branches";
import { BranchForm } from "@/modules/branches/components/branch-form";
import { prisma } from "@/src/lib/db";
import { NotFoundError } from "@/src/lib/errors";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function BranchEditPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.BRANCHES_MANAGE)) {
    redirect("/admin/branches");
  }

  const { t } = await getInterfaceLanguage();
  const { id } = await params;

  let branch;

  try {
    branch = await getBranch(account, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const warehouses = await prisma.warehouse.findMany({
    select: { id: true, code: true, name: true, branchId: true, isActive: true },
    orderBy: { code: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <Link href="/admin/branches" className="text-sm text-blue-700 hover:underline">
          ← {t.branches.title}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">
          {branch.name} <span className="text-sm font-normal text-slate-500">({branch.code})</span>
        </h1>
        <p className="text-sm text-slate-600">{t.branches.editPageHint}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <BranchForm
          mode="edit"
          branch={branch}
          warehouses={warehouses}
          labels={{ ...t.branches, saving: t.branches.saving }}
        />
      </section>
    </div>
  );
}
