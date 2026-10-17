"use client";

import { LoaderCircle, QrCode } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  pairingCode,
  type PairingCode,
} from "@/app/cars/[carId]/settings/actions";

const visibleMs = 120_000;
const quietZone = 4;

export function PairingCodePanel({
  carId,
  carName,
}: {
  carId: number;
  carName: string;
}) {
  const [code, setCode] = useState<PairingCode | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!code?.ok) return;
    const timer = setTimeout(() => setCode(null), visibleMs);
    return () => clearTimeout(timer);
  }, [code]);

  const shown = code?.ok ? code : null;
  const toggle = () => {
    if (shown) {
      setCode(null);
      return;
    }
    startTransition(async () => setCode(await pairingCode(carId)));
  };

  return (
    <div className="space-y-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-md text-sm text-muted-foreground">
          Scan the code with the My Tesla app to connect the phone to this
          server and open {carName}.
        </p>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-expanded={shown !== null}
          className="inline-flex h-10 items-center gap-2 rounded bg-background px-5 text-sm font-medium transition-tesla hover:bg-accent disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <QrCode className="size-4" />
          )}
          {shown ? "Hide the code" : "Show the code"}
        </button>
      </div>
      {code && !code.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {code.message}
        </p>
      ) : null}
      {shown ? (
        <div className="flex flex-wrap items-center gap-6">
          <svg
            role="img"
            aria-label={`QR code that connects the My Tesla app to ${shown.url}`}
            viewBox={`${-quietZone} ${-quietZone} ${shown.size + quietZone * 2} ${shown.size + quietZone * 2}`}
            shapeRendering="crispEdges"
            className="size-52 shrink-0 rounded bg-white text-black"
          >
            <path d={shown.path} fill="currentColor" />
          </svg>
          <div className="max-w-sm space-y-2 text-sm">
            <p className="font-medium break-all">{shown.url}</p>
            <p className="text-muted-foreground">
              {shown.token
                ? "The code holds the service token of the app. Anyone who scans it can open this dashboard, so show it only to yourself. It hides after 2 minutes."
                : "The code holds no service token. Behind Cloudflare Access, set MOBILE_ACCESS_CLIENT_ID and MOBILE_ACCESS_CLIENT_SECRET on the server, or type the token in the app."}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
