import type { Dictionary } from "./en";

/** Arabic interface strings. Typed as `Dictionary`: a missing key is a build error. */
export const ar: Dictionary = {
  nav: {
    dashboard: "لوحة التحكم",
    reports: "التقارير",
    products: "المنتجات",
    orders: "الطلبات",
    cart: "السلة",
    account: "الحساب",
    inventory: "المخزون",
    payments: "المدفوعات",
    pos: "نقطة البيع",
    admin: "الإدارة",
    deliveries: "التوصيلات",
    customers: "العملاء",
    employees: "الموظفون",
    roles: "الأدوار",
  },
  shell: {
    signOut: "تسجيل الخروج",
    notifications: "الإشعارات",
    language: "اللغة",
    openNavigation: "فتح القائمة",
    closeNavigation: "إغلاق القائمة",
  },
  auth: {
    appName: "منصة إدارة أعمال الملابس",
    signInTitle: "تسجيل الدخول",
    signInSubtitle: "استخدم بيانات حسابك للمتابعة.",
    identifier: "البريد الإلكتروني أو الهاتف",
    password: "كلمة المرور",
    signIn: "دخول",
    signingIn: "جارٍ الدخول...",
  },
};
