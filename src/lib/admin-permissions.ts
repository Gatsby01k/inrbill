import type { AdminPermission } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { verifyTotp } from "@/lib/totp";

export async function requireAdminPermission(permission: AdminPermission) {
  const admin = await requireRole("ADMIN");
  if (!admin.adminPermissions.includes(permission)) {
    throw new Error(`Missing admin permission: ${permission}.`);
  }
  return admin;
}

export async function verifyAdminStepUp(
  admin: Awaited<ReturnType<typeof requireAdminPermission>>,
  code: string,
) {
  if (!admin.totpEnabled || !admin.totpSecret) {
    throw new Error("Admin TOTP must be enabled before critical transaction actions.");
  }
  if (!(await consumeRateLimit("admin-step-up", admin.id, 8, 10 * 60_000))) {
    throw new Error("Too many step-up attempts. Try again later.");
  }
  if (!/^\d{6}$/.test(code) || !verifyTotp(admin.totpSecret, code)) {
    throw new Error("The authenticator code is invalid.");
  }
}
