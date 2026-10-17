import { KeyRound, Laptop, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  PasswordForm,
  RevokeButton,
  ScriptTokenForm,
  SignOutButton,
  SignOutOthersButton,
} from "@/components/auth/account-forms";
import { BackLink } from "@/components/back-link";
import { Panel } from "@/components/panel";
import { authStore, currentSession } from "@/lib/auth/session";
import type { Session } from "@/lib/auth/store";
import { isDemoMode } from "@/lib/demo/mode";
import { getFormatter } from "@/lib/viewer";

export const instant = false;

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

function sessionTitle(session: Session): string {
  if (session.kind === "web") return "Browser";
  if (session.platform === "script") return `Script token: ${session.name}`;
  return session.name ?? "Phone";
}

export default async function AccountPage() {
  await connection();
  if (isDemoMode()) redirect("/");
  const signedIn = await currentSession();
  if (!signedIn) redirect("/login?next=/account");
  const { user, session: current } = signedIn;
  const now = new Date();
  const [f, sessions] = await Promise.all([
    getFormatter(),
    Promise.resolve(authStore().listSessions(user.id, now.getTime())),
  ]);
  const active = sessions.filter((session) => session.status === "active");
  const when = (time: number) =>
    `${f.dayInline(new Date(time), now)} at ${f.clock(new Date(time))}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pt-6 pb-24 md:pt-10">
      <BackLink href="/" label="Dashboard" />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {user.role === "admin" ? "Admin" : "Member"} · {user.email}
          </p>
          <h1 className="mt-1 text-[32px] leading-[1.2] font-medium md:text-[40px]">
            {user.name}
          </h1>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-10 space-y-6">
        <Panel
          title="Sessions and phones"
          action={active.length > 1 ? <SignOutOthersButton /> : undefined}
        >
          <ul className="mt-2 divide-y divide-border">
            {active.map((session) => {
              const Icon =
                session.kind === "web"
                  ? Laptop
                  : session.platform === "script"
                    ? KeyRound
                    : Smartphone;
              const mine = session.id === current.id;
              return (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">
                        {sessionTitle(session)}
                        {mine && (
                          <span className="ml-2 text-xs font-normal text-good">
                            This session
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-muted-foreground">
                        {[`Last used ${when(session.lastUsedAt)}`, session.ip]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-0.5 text-xs text-subtle">
                        Signed in {when(session.createdAt)}
                      </p>
                    </div>
                  </div>
                  {!mine && (
                    <RevokeButton
                      id={session.id}
                      label={`Sign out ${sessionTitle(session)}`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Tokens for scripts">
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            A script or a home automation reads the API with a token. It lasts
            90 days after its last use, and the list above can revoke it.
          </p>
          <div className="mt-4 max-w-sm">
            <ScriptTokenForm />
          </div>
        </Panel>

        <Panel title="Password">
          <div className="mt-4 max-w-sm">
            <PasswordForm />
          </div>
        </Panel>
      </div>
    </main>
  );
}
