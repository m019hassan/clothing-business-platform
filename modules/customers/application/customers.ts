import "server-only";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type {
  CustomerDetailView,
  CustomerListView,
  CustomerOrderSummaryView,
} from "@/modules/customers/types";
import { prisma } from "@/src/lib/db";
import { NotFoundError, ValidationError, withDatabaseError } from "@/src/lib/errors";
import { isUuid, type Pagination } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const MAX_SEARCH_LENGTH = 100;
const RECENT_ORDERS_LIMIT = 10;

export type CustomerListFilters = {
  search?: string;
  marketingOnly?: boolean;
};

export function parseCustomerListFilters(searchParams: URLSearchParams): CustomerListFilters {
  const filters: CustomerListFilters = {};
  const search = searchParams.get("q");
  const marketing = searchParams.get("marketing");

  if (marketing === "1" || marketing === "true") {
    filters.marketingOnly = true;
  }

  if (search !== null) {
    const trimmed = search.trim();

    if (trimmed.length === 0 || trimmed.length > MAX_SEARCH_LENGTH) {
      throw new ValidationError(`q must be between 1 and ${MAX_SEARCH_LENGTH} characters.`);
    }

    filters.search = trimmed;
  }

  return filters;
}

const customerListSelection = {
  id: true,
  customerCode: true,
  firstName: true,
  lastName: true,
  createdAt: true,
  classification: { select: { name: true } },
  account: { select: { status: true, email: true, phone: true } },
  _count: { select: { orders: true } },
} satisfies Prisma.CustomerProfileSelect;

type CustomerListRecord = Prisma.CustomerProfileGetPayload<{
  select: typeof customerListSelection;
}>;

function mapCustomerListRow(record: CustomerListRecord): CustomerListView {
  return {
    id: record.id,
    customerCode: record.customerCode,
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.account.email,
    phone: record.account.phone,
    accountStatus: record.account.status,
    classificationName: record.classification?.name ?? null,
    orderCount: record._count.orders,
    createdAt: record.createdAt.toISOString(),
  };
}

function buildCustomerWhere(filters: CustomerListFilters): Prisma.CustomerProfileWhereInput {
  // The directory speaks about people, not the per-branch walk-in shells.
  const where: Prisma.CustomerProfileWhereInput = { isWalkIn: false };

  if (filters.marketingOnly === true) {
    where.marketingConsent = true;
  }

  if (filters.search !== undefined) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { customerCode: { contains: filters.search, mode: "insensitive" } },
      { account: { email: { contains: filters.search, mode: "insensitive" } } },
      { account: { phone: { contains: filters.search } } },
    ];
  }

  return where;
}

export type CustomerListPage = {
  customers: CustomerListView[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

/** Staff read of the customer directory. Requires customers.view. */
export async function listCustomers(
  account: AuthenticatedAccount,
  pagination: Pagination,
  filters: CustomerListFilters = {},
): Promise<CustomerListPage> {
  await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);

  const where = buildCustomerWhere(filters);

  return withDatabaseError(async () => {
    const [records, total] = await prisma.$transaction([
      prisma.customerProfile.findMany({
        where,
        select: customerListSelection,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.customerProfile.count({ where }),
    ]);

    return {
      customers: records.map(mapCustomerListRow),
      pagination: { limit: pagination.limit, offset: pagination.offset, total },
    };
  });
}

/** Staff read of one customer with recent orders. Requires customers.view. */
export async function getCustomer(
  account: AuthenticatedAccount,
  customerId: string,
): Promise<CustomerDetailView> {
  await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);

  if (!isUuid(customerId)) {
    throw new NotFoundError("Customer not found.");
  }

  return withDatabaseError(async () => {
    const record = await prisma.customerProfile.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        customerCode: true,
        firstName: true,
        lastName: true,
        gender: true,
        birthDate: true,
        marketingConsent: true,
        notes: true,
        createdAt: true,
        classification: { select: { name: true } },
        account: {
          select: { status: true, email: true, phone: true, lastLoginAt: true, createdAt: true },
        },
        orders: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: RECENT_ORDERS_LIMIT,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            currency: true,
            createdAt: true,
          },
        },
        _count: { select: { orders: true } },
      },
    });

    if (!record) {
      throw new NotFoundError("Customer not found.");
    }

    const orders: CustomerOrderSummaryView[] = record.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
    }));

    return {
      id: record.id,
      customerCode: record.customerCode,
      firstName: record.firstName,
      lastName: record.lastName,
      gender: record.gender,
      birthDate: record.birthDate ? record.birthDate.toISOString().slice(0, 10) : null,
      marketingConsent: record.marketingConsent,
      notes: record.notes,
      email: record.account.email,
      phone: record.account.phone,
      accountStatus: record.account.status,
      lastLoginAt: record.account.lastLoginAt ? record.account.lastLoginAt.toISOString() : null,
      classificationName: record.classification?.name ?? null,
      orderCount: record._count.orders,
      createdAt: record.createdAt.toISOString(),
      recentOrders: orders,
    };
  });
}

export type CustomersCsvLabels = {
  code: string;
  name: string;
  phone: string;
  email: string;
  classification: string;
  orders: string;
  marketingConsent: string;
  marketingYes: string;
  marketingNo: string;
  joined: string;
};

const CUSTOMER_EXPORT_LIMIT = 5000;

/** Quotes a cell when it holds a comma, quote or line break. */
function csvCell(value: string | number): string {
  const text = String(value);

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** BOM for Excel's Arabic, CRLF for spreadsheet apps. */
function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** +20… / +966… shape, so the sheet pastes straight into WhatsApp. */
export function toInternationalPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits === "") {
    return "";
  }

  if (trimmed.startsWith("+") || digits.startsWith("966") || digits.startsWith("20")) {
    return `+${digits}`;
  }

  if (digits.startsWith("00")) {
    return `+${digits.slice(2)}`;
  }

  if (digits.startsWith("0")) {
    return `+20${digits.slice(1)}`;
  }

  return `+${digits}`;
}

/** The whole directory as one WhatsApp-ready sheet, honouring the page filters. */
export async function exportCustomersCsv(
  account: AuthenticatedAccount,
  filters: CustomerListFilters,
  labels: CustomersCsvLabels,
): Promise<string> {
  await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);

  const where = buildCustomerWhere(filters);

  const records = await withDatabaseError(() =>
    prisma.customerProfile.findMany({
      where,
      select: {
        customerCode: true,
        firstName: true,
        lastName: true,
        marketingConsent: true,
        createdAt: true,
        classification: { select: { name: true } },
        account: { select: { email: true, phone: true } },
        _count: { select: { orders: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: CUSTOMER_EXPORT_LIMIT,
    }),
  );

  return toCsv(
    [
      labels.code,
      labels.name,
      labels.phone,
      labels.email,
      labels.classification,
      labels.orders,
      labels.marketingConsent,
      labels.joined,
    ],
    records.map((record) => [
      record.customerCode,
      [record.firstName, record.lastName].filter(Boolean).join(" "),
      toInternationalPhone(record.account.phone),
      record.account.email ?? "",
      record.classification.name,
      record._count.orders,
      record.marketingConsent ? labels.marketingYes : labels.marketingNo,
      record.createdAt.toISOString().slice(0, 10),
    ]),
  );
}

export type CustomerOrdersPage = {
  customerName: string;
  orders: CustomerOrderSummaryView[];
  pagination: { limit: number; offset: number; total: number; totalSpent: string };
};

/** Every invoice of one customer, newest first, with the running spend. */
export async function listCustomerOrders(
  account: AuthenticatedAccount,
  customerId: string,
  pagination: Pagination,
): Promise<CustomerOrdersPage> {
  await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);

  if (!isUuid(customerId)) {
    throw new NotFoundError("Customer not found.");
  }

  return withDatabaseError(async () => {
    const customer = await prisma.customerProfile.findUnique({
      where: { id: customerId },
      select: { firstName: true, lastName: true },
    });

    if (customer === null) {
      throw new NotFoundError("Customer not found.");
    }

    const [records, total, spend] = await prisma.$transaction([
      prisma.order.findMany({
        where: { customerProfileId: customerId },
        select: { id: true, orderNumber: true, status: true, totalAmount: true, currency: true, createdAt: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.order.count({ where: { customerProfileId: customerId } }),
      prisma.order.aggregate({ where: { customerProfileId: customerId }, _sum: { totalAmount: true } }),
    ]);

    return {
      customerName: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
      orders: records.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount.toFixed(2),
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
      })),
      pagination: {
        limit: pagination.limit,
        offset: pagination.offset,
        total,
        totalSpent: (spend._sum.totalAmount ?? new Prisma.Decimal(0)).toFixed(2),
      },
    };
  });
}
