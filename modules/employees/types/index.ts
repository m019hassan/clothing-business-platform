export type EmployeeRowView = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string;
  accountStatus: string;
  jobTitle: string | null;
  departmentName: string | null;
  hireDate: string | null;
  roles: string[];
};

export type EmployeeDetailView = EmployeeRowView & {
  createdAt: string;
  preferredLanguage: string;
  timezone: string;
};

export type EmployeePageView = {
  rows: EmployeeRowView[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type PermissionCatalogEntry = {
  module: string;
  permissions: {
    code: string;
    name: string;
  }[];
};

export type RoleView = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
  permissionCodes: string[];
  employeeCount: number;
};

export type AccessOverviewView = {
  roles: RoleView[];
  catalog: PermissionCatalogEntry[];
};

export type RoleWithPermissionsView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissionCodes: string[];
};

