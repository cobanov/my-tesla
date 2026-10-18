import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/reset-form";
import { authStore } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo/mode";

export const instant = false;

export const metadata: Metadata = {
  title: "Reset the password",
  robots: { index: false, follow: false },
};

function resetFor(token: string) {
  return authStore().passwordResetUser(token, Date.now());
}

export default async function ResetPage({ searchParams }: PageProps<"/reset">) {
  await connection();
  if (isDemoMode()) notFound();
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const user = resetFor(value);
  if (!user) {
    return (
      <AuthCard
        title="This reset link does not work"
        intro="It was used, or it is older than 30 minutes. Run the reset command on the server again for a new link."
      >
        <Link href="/login" className="text-sm font-medium underline">
          Sign in
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Set a new password"
      intro={`For ${user.name}. The link works once.`}
    >
      <ResetForm token={value} email={user.email} />
    </AuthCard>
  );
}
