export type BranchWarehouseView = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type BranchView = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  warehouses: BranchWarehouseView[];
};
