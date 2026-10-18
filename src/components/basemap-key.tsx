"use client";

import { createContext, use, type ReactNode } from "react";

const BasemapKeyContext = createContext<string | null>(null);

export function BasemapKeyProvider({
  value,
  children,
}: {
  value: string | null;
  children: ReactNode;
}) {
  return <BasemapKeyContext value={value}>{children}</BasemapKeyContext>;
}

export function useBasemapKey(): string | null {
  return use(BasemapKeyContext);
}
