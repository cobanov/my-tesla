import { cn } from "@/lib/utils";

export function ChargerBadge({ fast }: { fast: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium",
        fast ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {fast ? "DC" : "AC"}
    </span>
  );
}
