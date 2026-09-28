/** English interface strings. `ar.ts` is typed against this, so a new key here
 *  fails the build until Arabic is written for it. */
export const en = {
  nav: {
    dashboard: "Dashboard",
    reports: "Reports",
    products: "Products",
    orders: "Orders",
    cart: "Cart",
    account: "Account",
    inventory: "Inventory",
    payments: "Payments",
    pos: "Point of sale",
    admin: "Admin",
    deliveries: "Deliveries",
    customers: "Customers",
    employees: "Employees",
    roles: "Roles",
  },
  shell: {
    signOut: "Sign out",
    notifications: "Notifications",
    language: "Language",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
  },
  auth: {
    appName: "Clothing Business Platform",
    signInTitle: "Sign in",
    signInSubtitle: "Use your account credentials to continue.",
    identifier: "Email or phone",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in...",
  },
} as const;

/** Same keys as `en`, but with plain `string` values so another language can fill them. */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof en>;
