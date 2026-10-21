import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AuthCard } from "@/components/auth/auth-card";
import { JoinForm } from "@/components/auth/join-form";
import { authStore } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo/mode";

export const instant = false;

export const metadata: Metadata = {
  title: "Join",
  robots: { index: false, follow: false },
};

function openInvite(token: string) {
  return authStore().inviteByToken(token, Date.now());
}

export default async function InvitePage({
  searchParams,
}: PageProps<"/invite">) {
  await connection();
  if (isDemoMode()) notFound();
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const invite = openInvite(value);
  if (!invite) {
    return (
      <AuthCard
        title="This invite does not work"
        intro="It was used or revoked, or it is older than 3 days. Ask the admin of this My Tesla for a new link."
      >
        <Link href="/login" className="text-sm font-medium underline">
          Sign in
        </Link>
      </AuthCard>
    );
  }
  const from = authStore().userById(invite.createdBy);
  return (
    <AuthCard
      title="Join My Tesla"
      intro={`${from?.name ?? "The admin"} invited you. Choose your name and a password. You can see every car and keep your own Settings.`}
    >
      <JoinForm token={value} email={invite.email} />
    </AuthCard>
  );
}
