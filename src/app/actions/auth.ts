"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, roleHome, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { loginSchema, type ActionState } from "@/lib/schemas";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);

  const next = formData.get("next");
  const target =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : roleHome(user.role);
  redirect(target);
}

export async function logout() {
  await destroySession();
  redirect("/");
}
