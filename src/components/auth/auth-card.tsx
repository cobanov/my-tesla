import type { ReactNode } from "react";
import { TeslaMark } from "@/components/tesla-mark";

export function AuthCard({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <TeslaMark className="size-10 text-foreground" />
        <h1 className="mt-8 text-[32px] leading-[1.2] font-medium">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{intro}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
