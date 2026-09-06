import type { ReactNode } from "react";

import { hasPermission } from "@/modules/auth/application/authorization";

type CanProps = {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export async function Can({ permission, children, fallback = null }: CanProps) {
  return (await hasPermission(permission)) ? children : fallback;
}