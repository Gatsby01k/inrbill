import { db } from "@/lib/db";

// The Notification model (schema.prisma) is brand new. This sandbox has no
// internet access to run `npx prisma generate`, so the Prisma Client's
// runtime delegate for it doesn't exist here yet — `npx prisma db push` on
// your own machine regenerates the real client and this local type stops
// being necessary (it's scoped to this file only, so it can't mask a typo
// anywhere else). Every field here matches the schema exactly.
export type NotificationRow = {
  id: string;
  userId: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

type NotificationDelegate = {
  create(args: {
    data: { userId: string; title: string; body: string; link: string | null };
  }): Promise<NotificationRow>;
  findMany(args: {
    where: { userId: string };
    orderBy: { createdAt: "desc" };
    take: number;
  }): Promise<NotificationRow[]>;
  count(args: { where: { userId: string; read: boolean } }): Promise<number>;
  updateMany(args: { where: Record<string, unknown>; data: { read: boolean } }): Promise<{ count: number }>;
};

const notificationDb = (db as unknown as { notification: NotificationDelegate }).notification;

/** Writes one in-app notification row. Never throws — a failed write here
    should never take down whatever action triggered it. */
export async function createNotification(
  userId: string,
  opts: { title: string; body: string; link?: string },
): Promise<void> {
  try {
    await notificationDb.create({
      data: { userId, title: opts.title, body: opts.body, link: opts.link ?? null },
    });
  } catch (err) {
    console.error("createNotification failed", err);
  }
}

export async function listNotifications(userId: string, limit = 15) {
  const [items, unreadCount] = await Promise.all([
    notificationDb.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    notificationDb.count({ where: { userId, read: false } }),
  ]);
  return { items, unreadCount };
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  await notificationDb.updateMany({
    where: ids && ids.length ? { userId, id: { in: ids } } : { userId, read: false },
    data: { read: true },
  });
}
