"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const copiedMs = 2_000;

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const code = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), copiedMs);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      if (code.current) window.getSelection()?.selectAllChildren(code.current);
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-card py-2 pr-1 pl-3">
      <code
        ref={code}
        className="min-w-0 flex-1 py-1.5 text-xs leading-5 break-all select-all"
      >
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy the ${label}`}
        className="flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground transition-tesla hover:bg-accent hover:text-foreground"
      >
        {copied ? (
          <Check aria-hidden className="size-4 text-good" />
        ) : (
          <Copy aria-hidden className="size-4" />
        )}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
