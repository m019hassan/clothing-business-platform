import type { SelfProfileView } from "@/modules/auth/application/self-profile";

type PermissionEntry = readonly [code: string, ar: string, en: string];

const GROUPS: { ar: string; en: string; permissions: PermissionEntry[] }[] = [
  {
    ar: "المنتجات",
    en: "Products",
    permissions: [
      ["products.view", "عرض المنتجات", "View products"],
      ["products.create", "إضافة منتج", "Create products"],
      ["products.update", "تعديل منتج", "Edit products"],
      ["products.delete", "حذف منتج", "Delete products"],
      ["products.cost.view", "رؤية التكلفة", "View cost"],
      ["discounts.manage", "إدارة الخصومات", "Manage discounts"],
    ],
  },
  {
    ar: "المخزون",
    en: "Inventory",
    permissions: [
      ["inventory.view", "عرض المخزون", "View inventory"],
      ["inventory.adjust", "تعديل المخزون", "Adjust inventory"],
    ],
  },
  {
    ar: "الطلبات",
    en: "Orders",
    permissions: [
      ["orders.view", "عرض الطلبات", "View orders"],
      ["orders.create", "إنشاء طلب", "Create orders"],
      ["orders.cancel", "إلغاء طلب", "Cancel orders"],
      ["orders.manage", "إدارة الطلبات", "Manage orders"],
    ],
  },
  {
    ar: "العملاء",
    en: "Customers",
    permissions: [
      ["customers.view", "عرض العملاء", "View customers"],
      ["customers.create", "إضافة عميل", "Create customers"],
      ["customers.update", "تعديل عميل", "Edit customers"],
    ],
  },
  {
    ar: "الموظفون والفروع",
    en: "Employees & branches",
    permissions: [
      ["employees.view", "عرض الموظفين", "View employees"],
      ["employees.create", "إضافة موظف", "Create employees"],
      ["employees.update", "تعديل موظف", "Edit employees"],
      ["shipping.manage", "إدارة الشحن", "Manage shipping"],
      ["branches.view", "عرض الفروع", "View branches"],
      ["branches.manage", "إدارة الفروع", "Manage branches"],
    ],
  },
  {
    ar: "المستخدمون والأدوار",
    en: "Users & roles",
    permissions: [
      ["users.view", "عرض المستخدمين", "View users"],
      ["users.manage", "إدارة المستخدمين", "Manage users"],
      ["roles.view", "عرض الأدوار", "View roles"],
      ["roles.create", "إضافة دور", "Create roles"],
      ["roles.update", "تعديل دور", "Edit roles"],
      ["roles.delete", "حذف دور", "Delete roles"],
    ],
  },
  {
    ar: "المدفوعات والتدقيق",
    en: "Payments & audit",
    permissions: [
      ["payments.view", "عرض المدفوعات", "View payments"],
      ["payments.verify", "التحقق من الدفع", "Verify payments"],
      ["payments.approve", "اعتماد الدفع", "Approve payments"],
      ["payments.reject", "رفض الدفع", "Reject payments"],
      ["payments.refund", "الاسترداد", "Refund payments"],
      ["audit.view", "سجل التدقيق", "View audit log"],
    ],
  },
];

const TOTAL = GROUPS.reduce((sum, group) => sum + group.permissions.length, 0);

export function AccountAccess({
  profile,
  isArabic,
  accountType,
}: {
  profile: SelfProfileView;
  isArabic: boolean;
  accountType: string;
}) {
  const granted = new Set(profile.permissions);
  const grantedCount = GROUPS.reduce(
    (sum, group) => sum + group.permissions.filter(([code]) => granted.has(code)).length,
    0,
  );

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {isArabic ? "الأدوار والصلاحيات" : "Roles & permissions"}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {isArabic
              ? "الصلاحيات الفعلية الممنوحة لحسابك من الأدوار النشطة."
              : "Effective permissions granted to your account by active roles."}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {isArabic ? `${grantedCount} من ${TOTAL} صلاحية` : `${grantedCount} of ${TOTAL} permissions`}
        </span>
      </div>

      {profile.roles.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {profile.roles.map((role) => (
            <span
              key={role.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"
            >
              {role.name}
              <span className="font-mono text-[10px] font-normal text-blue-500">{role.code}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {accountType === "DISTRIBUTOR"
            ? isArabic
              ? "حساب كاشير: مفيش أدوار — صلاحياتك جاية من ملف الكاشير تحت."
              : "Cashier account: no roles — your abilities come from the cashier profile below."
            : isArabic
              ? "مفيش أدوار مربوطة بالحساب، فمفيش صلاحيات إدارية."
              : "No roles are attached to this account, so it holds no staff permissions."}
        </p>
      )}

      {profile.distributor ? (
        <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
          <p className="text-slate-600">
            {isArabic ? "كود الموزّع: " : "Distributor code: "}
            <span className="font-mono font-semibold text-slate-900">{profile.distributor.code}</span>
          </p>
          <p className="text-slate-600">
            {isArabic ? "الفرع: " : "Branch: "}
            <span className="font-semibold text-slate-900">
              {profile.branch ? `${profile.branch.name} (${profile.branch.code})` : "—"}
            </span>
          </p>
          <p className="text-slate-600">
            {isArabic ? "خصم على الفاتورة: " : "Invoice discount: "}
            <span className={profile.distributor.canDiscount ? "font-semibold text-emerald-700" : "font-semibold text-slate-500"}>
              {profile.distributor.canDiscount ? (isArabic ? "مسموح" : "Allowed") : isArabic ? "غير مسموح" : "Not allowed"}
            </span>
          </p>
          <p className="text-slate-600">
            {isArabic ? "الكود الشخصي: " : "Personal code: "}
            <span className="font-mono font-semibold text-slate-900">
              {profile.distributor.discountCode ?? "—"}
              {profile.distributor.discountPercent ? ` · ${profile.distributor.discountPercent}%` : ""}
            </span>
          </p>
        </div>
      ) : profile.branch ? (
        <p className="text-sm text-slate-600">
          {isArabic ? "الفرع: " : "Branch: "}
          <span className="font-semibold text-slate-900">{profile.branch.name} ({profile.branch.code})</span>
        </p>
      ) : null}

      {accountType === "EMPLOYEE" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {GROUPS.map((group) => {
            const count = group.permissions.filter(([code]) => granted.has(code)).length;

            return (
              <div key={group.en} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{isArabic ? group.ar : group.en}</p>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {count}/{group.permissions.length}
                  </span>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {group.permissions.map(([code, ar, en]) => {
                    const has = granted.has(code);

                    return (
                      <li
                        key={code}
                        title={code}
                        className={
                          has
                            ? "rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200"
                            : "rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-inset ring-slate-200 line-through decoration-slate-300"
                        }
                      >
                        {isArabic ? ar : en}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
