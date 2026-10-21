import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeNext } from "@/lib/auth/paths";
import { authStore, currentSession } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo/mode";

export const instant = false;

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  await connection();
  if (isDemoMode()) redirect("/");
  if (authStore().userCount() === 0) redirect("/setup");
  if (await currentSession()) redirect("/");
  const { next } = await searchParams;
  return (
    <AuthCard title="Sign in" intro="Sign in to see your cars.">
      <LoginForm next={safeNext(typeof next === "string" ? next : null)} />
    </AuthCard>
  );
}
