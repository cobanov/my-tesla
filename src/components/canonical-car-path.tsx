"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { canonicalCarPath } from "@/lib/car-slug";

export function CanonicalCarPath({ slug }: { slug: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const canonical = canonicalCarPath(pathname, slug);
    if (canonical === pathname) return;
    const { search, hash } = window.location;
    window.history.replaceState(null, "", `${canonical}${search}${hash}`);
  }, [pathname, slug]);

  return null;
}
