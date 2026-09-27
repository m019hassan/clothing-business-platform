import "server-only";

import { AccountStatus, type NotificationType, type Prisma } from "@prisma/client";

import { createNotification } from "@/modules/notification/application/notifications";

export type BranchNotificationInput = {
  branchId: string;
  /** Permission that makes the recipient responsible for this kind of event. */
  permission: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  /** Someone who already knows about the event (usually the actor). */
  excludeAccountId?: string;
};

/**
 * Notifies the staff of one branch who hold a given permission.
 *
 * Recipients are resolved from the branch of their employee profile and their
 * active roles, so no recipient list is hardcoded and a permission change adjusts
 * the audience automatically. The recipient's own notification preference is still
 * honoured by createNotification, and the actor is skipped.
 */
export async function notifyBranchPermissionHolders(
  transaction: Prisma.TransactionClient,
  input: BranchNotificationInput,
): Promise<number> {
  const profiles = await transaction.employeeProfile.findMany({
    where: {
      branchId: input.branchId,
      account: { status: AccountStatus.ACTIVE },
      employeeRoles: {
        some: {
          role: {
            isActive: true,
            rolePermissions: {
              some: { permission: { code: input.permission, isActive: true } },
            },
          },
        },
      },
    },
    select: { accountId: true },
  });

  const recipients = profiles
    .map((profile) => profile.accountId)
    .filter((accountId) => accountId !== input.excludeAccountId);

  for (const accountId of recipients) {
    await createNotification(transaction, {
      accountId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  }

  return recipients.length;
}
