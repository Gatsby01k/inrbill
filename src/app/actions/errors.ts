"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const ERRORS_PATH = "/admin/errors";

function s(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function resolveError(fd: FormData) {
  await requireRole("ADMIN");
  const id = s(fd, "id");
  if (!id) redirect(ERRORS_PATH);
  await db.errorLog.update({
    where: { id },
    data: { resolved: true, resolvedAt: new Date() },
  });
  revalidatePath(ERRORS_PATH);
  redirect(ERRORS_PATH);
}

export async function reopenError(fd: FormData) {
  await requireRole("ADMIN");
  const id = s(fd, "id");
  if (!id) redirect(ERRORS_PATH);
  await db.errorLog.update({
    where: { id },
    data: { resolved: false, resolvedAt: null },
  });
  revalidatePath(ERRORS_PATH);
  redirect(ERRORS_PATH);
}
