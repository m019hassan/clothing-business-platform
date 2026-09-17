import "server-only";

import { AccountType, CartStatus, Prisma, ProductStatus } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type { AddItemInput, CartView, UpdateItemInput } from "@/modules/cart/types";
import { prisma } from "@/src/lib/db";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

const MAX_LINE_QUANTITY = 999;

type AuthenticatedAccount = NonNullable<SafeAccount>;
type TransactionClient = Prisma.TransactionClient;

class RetryableReservationConflict extends Error {}

const cartSelection = {
  id: true,
  status: true,
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      quantity: true,
      variant: {
        select: {
          id: true,
          sku: true,
          size: true,
          color: true,
          priceOverride: true,
          product: {
            select: { id: true, name: true, basePrice: true, currency: true },
          },
        },
      },
    },
  },
} satisfies Prisma.CartSelect;

type CartRecord = Prisma.CartGetPayload<{ select: typeof cartSelection }>;

function requireCustomerProfile(account: AuthenticatedAccount) {
  if (account.accountType !== AccountType.CUSTOMER || !account.customerProfile) {
    throw new AuthorizationError("A customer account is required.");
  }

  return account.customerProfile;
}

export function parseQuantityInput(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }

  return Number.NaN;
}

function validateQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_LINE_QUANTITY) {
    throw new ValidationError(
      `Quantity must be a whole number between 1 and ${MAX_LINE_QUANTITY}.`,
    );
  }
}

function toEmptyCart(): CartView {
  return { id: null, status: CartStatus.ACTIVE, items: [], total: "0" };
}

function mapCart(cart: CartRecord): CartView {
  const items = cart.items.map((item) => {
    const unitPrice = item.variant.priceOverride ?? item.variant.product.basePrice;

    return {
      id: item.id,
      variantId: item.variant.id,
      sku: item.variant.sku,
      size: item.variant.size,
      color: item.variant.color,
      productId: item.variant.product.id,
      productName: item.variant.product.name,
      quantity: item.quantity,
      unitPrice: unitPrice.toString(),
      lineTotal: unitPrice.mul(item.quantity).toString(),
      currency: item.variant.product.currency,
    };
  });

  const total = cart.items.reduce((sum, item) => {
    const unitPrice = item.variant.priceOverride ?? item.variant.product.basePrice;

    return sum.add(unitPrice.mul(item.quantity));
  }, new Prisma.Decimal(0));

  return { id: cart.id, status: cart.status, items, total: total.toString() };
}

async function loadCart(customerProfileId: string): Promise<CartView> {
  const cart = await prisma.cart.findUnique({
    where: {
      customerProfileId_status: {
        customerProfileId,
        status: CartStatus.ACTIVE,
      },
    },
    select: cartSelection,
  });

  return cart ? mapCart(cart) : toEmptyCart();
}

async function findOrCreateActiveCart(customerProfileId: string): Promise<{ id: string }> {
  const existing = await prisma.cart.findUnique({
    where: {
      customerProfileId_status: { customerProfileId, status: CartStatus.ACTIVE },
    },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  try {
    return await prisma.cart.create({
      data: { customerProfileId, status: CartStatus.ACTIVE },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.cart.findUnique({
        where: {
          customerProfileId_status: { customerProfileId, status: CartStatus.ACTIVE },
        },
        select: { id: true },
      });

      if (raced) {
        return raced;
      }
    }

    throw error;
  }
}

async function runCartTransaction<T>(
  operation: (transaction: TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await prisma.$transaction(operation);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.$transaction(operation);
    }

    if (error instanceof RetryableReservationConflict) {
      try {
        return await prisma.$transaction(operation);
      } catch (retryError) {
        if (retryError instanceof RetryableReservationConflict) {
          throw new ConflictError("Stock changed while processing the request. Please try again.");
        }

        throw retryError;
      }
    }

    throw error;
  }
}

async function isVariantSellable(
  transaction: TransactionClient,
  variantId: string,
): Promise<boolean> {
  const variant = await transaction.productVariant.findFirst({
    where: {
      id: variantId,
      status: ProductStatus.ACTIVE,
      product: { status: ProductStatus.ACTIVE, deletedAt: null },
    },
    select: { id: true },
  });

  return variant !== null;
}

async function reserveStock(
  transaction: TransactionClient,
  variantId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  const rows = await transaction.inventoryItem.findMany({
    where: { variantId },
    select: { id: true, quantityOnHand: true, quantityReserved: true },
    orderBy: { quantityOnHand: "desc" },
  });

  const available = rows.reduce(
    (sum, row) => sum + row.quantityOnHand - row.quantityReserved,
    0,
  );

  if (available < quantity) {
    throw new ConflictError("Insufficient stock for the requested quantity.");
  }

  let remaining = quantity;

  for (const row of rows) {
    if (remaining <= 0) {
      break;
    }

    const headroom = row.quantityOnHand - row.quantityReserved;

    if (headroom <= 0) {
      continue;
    }

    const amount = Math.min(headroom, remaining);

    const result = await transaction.inventoryItem.updateMany({
      where: {
        id: row.id,
        quantityReserved: row.quantityReserved,
        quantityOnHand: { gte: row.quantityReserved + amount },
      },
      data: { quantityReserved: { increment: amount } },
    });

    if (result.count === 0) {
      throw new RetryableReservationConflict("Reservation state changed concurrently.");
    }

    remaining -= amount;
  }

  if (remaining > 0) {
    throw new RetryableReservationConflict("Reservation state changed concurrently.");
  }
}

async function releaseStock(
  transaction: TransactionClient,
  variantId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  const rows = await transaction.inventoryItem.findMany({
    where: { variantId, quantityReserved: { gt: 0 } },
    select: { id: true, quantityReserved: true },
    orderBy: { quantityReserved: "desc" },
  });

  const reservedTotal = rows.reduce((sum, row) => sum + row.quantityReserved, 0);

  if (reservedTotal < quantity) {
    throw new ConflictError("Unable to release more stock than reserved.");
  }

  let remaining = quantity;

  for (const row of rows) {
    if (remaining <= 0) {
      break;
    }

    const amount = Math.min(row.quantityReserved, remaining);

    const result = await transaction.inventoryItem.updateMany({
      where: { id: row.id, quantityReserved: { gte: amount } },
      data: { quantityReserved: { decrement: amount } },
    });

    if (result.count === 0) {
      throw new RetryableReservationConflict("Reservation state changed concurrently.");
    }

    remaining -= amount;
  }

  if (remaining > 0) {
    throw new RetryableReservationConflict("Reservation state changed concurrently.");
  }
}

export async function getCart(account: AuthenticatedAccount): Promise<CartView> {
  const profile = requireCustomerProfile(account);

  return withDatabaseError(() => loadCart(profile.id));
}

export async function addItem(
  account: AuthenticatedAccount,
  input: AddItemInput,
): Promise<CartView> {
  const profile = requireCustomerProfile(account);

  if (!isUuid(input.variantId)) {
    throw new NotFoundError("Variant not found.");
  }

  validateQuantity(input.quantity);

  const cart = await withDatabaseError(() => findOrCreateActiveCart(profile.id));

  await withDatabaseError(() =>
    runCartTransaction(async (transaction) => {
      if (!(await isVariantSellable(transaction, input.variantId))) {
        throw new NotFoundError("Variant not found.");
      }

      const existingItem = await transaction.cartItem.findUnique({
        where: {
          cartId_variantId: { cartId: cart.id, variantId: input.variantId },
        },
        select: { id: true, quantity: true },
      });

      await reserveStock(transaction, input.variantId, input.quantity);

      if (existingItem) {
        await transaction.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + input.quantity },
        });
      } else {
        await transaction.cartItem.create({
          data: {
            cartId: cart.id,
            variantId: input.variantId,
            quantity: input.quantity,
          },
        });
      }
    }),
  );

  return withDatabaseError(() => loadCart(profile.id));
}

export async function updateItem(
  account: AuthenticatedAccount,
  cartItemId: string,
  input: UpdateItemInput,
): Promise<CartView> {
  const profile = requireCustomerProfile(account);

  if (!isUuid(cartItemId)) {
    throw new NotFoundError("Cart item not found.");
  }

  validateQuantity(input.quantity);

  await withDatabaseError(() =>
    runCartTransaction(async (transaction) => {
      const item = await transaction.cartItem.findFirst({
        where: { id: cartItemId, cart: { customerProfileId: profile.id } },
        select: {
          id: true,
          quantity: true,
          variantId: true,
          cart: { select: { status: true } },
        },
      });

      if (!item) {
        throw new NotFoundError("Cart item not found.");
      }

      if (item.cart.status !== CartStatus.ACTIVE) {
        throw new ConflictError("Cart can no longer be modified.");
      }

      const difference = input.quantity - item.quantity;

      if (difference > 0) {
        if (!(await isVariantSellable(transaction, item.variantId))) {
          throw new ConflictError("This product is no longer available.");
        }

        await reserveStock(transaction, item.variantId, difference);
      } else if (difference < 0) {
        await releaseStock(transaction, item.variantId, -difference);
      }

      await transaction.cartItem.update({
        where: { id: item.id },
        data: { quantity: input.quantity },
      });
    }),
  );

  return withDatabaseError(() => loadCart(profile.id));
}

export async function removeItem(
  account: AuthenticatedAccount,
  cartItemId: string,
): Promise<CartView> {
  const profile = requireCustomerProfile(account);

  if (!isUuid(cartItemId)) {
    throw new NotFoundError("Cart item not found.");
  }

  await withDatabaseError(() =>
    runCartTransaction(async (transaction) => {
      const item = await transaction.cartItem.findFirst({
        where: { id: cartItemId, cart: { customerProfileId: profile.id } },
        select: {
          id: true,
          quantity: true,
          variantId: true,
          cart: { select: { status: true } },
        },
      });

      if (!item) {
        throw new NotFoundError("Cart item not found.");
      }

      if (item.cart.status !== CartStatus.ACTIVE) {
        throw new ConflictError("Cart can no longer be modified.");
      }

      await transaction.cartItem.delete({ where: { id: item.id } });
      await releaseStock(transaction, item.variantId, item.quantity);
    }),
  );

  return withDatabaseError(() => loadCart(profile.id));
}
