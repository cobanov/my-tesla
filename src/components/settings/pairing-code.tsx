"use client";

import { Check, LoaderCircle, QrCode, Smartphone } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  answerPairing,
  pairingCode,
  pairingRequests,
  type PairingCode,
  type PairingRequest,
} from "@/lib/auth/actions";

const openMs = 180_000;
const renewBeforeMs = 30_000;
const pollMs = 2_000;
const quietZone = 4;

const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded px-5 text-sm font-medium transition-tesla disabled:opacity-60";

function useVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

function platformName(platform: string): string {
  if (platform === "ios") return "iOS";
  if (platform === "android") return "Android";
  return platform;
}

function Request({
  request,
  onAnswer,
}: {
  request: PairingRequest;
  onAnswer: (allow: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div
      role="alertdialog"
      aria-labelledby={`pair-${request.id}`}
      className="space-y-4 rounded-lg bg-background p-4"
    >
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 size-5 shrink-0" />
        <div className="text-sm">
          <p id={`pair-${request.id}`} className="font-medium">
            {request.name} wants to sign in as you
          </p>
          <p className="mt-1 text-muted-foreground">
            {[platformName(request.platform), request.ip]
              .filter(Boolean)
              .join(" · ")}
            . Allow it only if you scanned the code with your own phone just
            now, and the phone shows{" "}
            <span className="font-medium text-foreground tabular">
              {request.check}
            </span>
            .
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => onAnswer(false))}
          className={`${buttonClass} flex-1 bg-card hover:bg-accent`}
        >
          Deny
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => onAnswer(true))}
          className={`${buttonClass} flex-1 bg-card hover:bg-accent`}
        >
          Allow
        </button>
      </div>
    </div>
  );
}

export function PairingCodePanel({
  carId,
  carName,
}: {
  carId: number;
  carName: string;
}) {
  const visible = useVisible();
  const [openUntil, setOpenUntil] = useState<number | null>(null);
  const [code, setCode] = useState<PairingCode | null>(null);
  const [requests, setRequests] = useState<PairingRequest[]>([]);
  const [paired, setPaired] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const open = openUntil !== null;

  useEffect(() => {
    if (!open || !visible) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const renew = async () => {
      if (Date.now() >= (openUntil ?? 0)) {
        setOpenUntil(null);
        setCode(null);
        return;
      }
      const next = await pairingCode(carId);
      if (cancelled) return;
      setCode(next);
      if (next.ok) {
        timer = setTimeout(
          renew,
          Math.max(5_000, next.expiresAt - renewBeforeMs - Date.now()),
        );
      }
    };
    renew();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, visible, openUntil, carId]);

  useEffect(() => {
    if (!open || !visible) return;
    let cancelled = false;
    const poll = async () => {
      const next = await pairingRequests();
      if (!cancelled) setRequests(next);
    };
    poll();
    const timer = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [open, visible]);

  const close = () => {
    setOpenUntil(null);
    setCode(null);
    setRequests([]);
  };

  const answer = async (request: PairingRequest, allow: boolean) => {
    const done = await answerPairing(request.id, allow);
    setRequests((current) => current.filter((item) => item.id !== request.id));
    if (allow && done) {
      setPaired(request.name);
      close();
    }
  };

  const shown = code?.ok ? code : null;
  return (
    <div className="space-y-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-md text-sm text-muted-foreground">
          Scan the code with the My Tesla app to sign the phone in as you and
          open {carName}. The code changes every minute and works once.
        </p>
        <button
          type="button"
          disabled={pending}
          aria-expanded={open}
          onClick={() =>
            open
              ? close()
              : startTransition(() => {
                  setPaired(null);
                  setOpenUntil(Date.now() + openMs);
                })
          }
          className={`${buttonClass} bg-background hover:bg-accent`}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <QrCode className="size-4" />
          )}
          {open ? "Hide the code" : "Pair a phone"}
        </button>
      </div>
      {paired && (
        <p role="status" className="flex items-center gap-2 text-sm text-good">
          <Check className="size-4" />
          {paired} is signed in. You can remove it in your account.
        </p>
      )}
      {code && !code.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {code.message}
        </p>
      ) : null}
      {requests.map((request) => (
        <Request
          key={request.id}
          request={request}
          onAnswer={(allow) => answer(request, allow)}
        />
      ))}
      {open && shown ? (
        <div className="flex flex-wrap items-center gap-6">
          <svg
            role="img"
            aria-label={`QR code that signs the My Tesla app in to ${shown.url}`}
            viewBox={`${-quietZone} ${-quietZone} ${shown.size + quietZone * 2} ${shown.size + quietZone * 2}`}
            shapeRendering="crispEdges"
            className="size-52 shrink-0 rounded bg-white text-black"
          >
            <path d={shown.path} fill="currentColor" />
          </svg>
          <div className="max-w-sm space-y-2 text-sm">
            <p className="font-medium break-all">{shown.url}</p>
            <p className="text-muted-foreground">
              The code holds no password. After the scan, this page asks you to
              allow the phone. The code hides after 3 minutes.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
