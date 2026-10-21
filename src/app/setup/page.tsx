import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AuthCard } from "@/components/auth/auth-card";
import { SetupForm } from "@/components/auth/setup-form";
import { authStore } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo/mode";

export const instant = false;

export const metadata: Metadata = {
  title: "Set up",
  robots: { index: false, follow: false },
};

export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  await connection();
  if (isDemoMode() || authStore().userCount() > 0) notFound();
  const { token } = await searchParams;
  return (
    <AuthCard
      title="Create the admin account"
      intro="This is the first account of this My Tesla. It can see every car and change every setting."
    >
      <SetupForm token={typeof token === "string" ? token : ""} />
    </AuthCard>
  );
}
