import type { PeriodId } from "@contract";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useInsight, type InsightKind } from "@/api/queries";
import { useCar } from "@/car/car-provider";
import { InsightBody, PeriodControl } from "@/components/insight-body";
import { icons } from "@/components/icons";
import { LinkRow } from "@/components/link-row";
import { QueryView } from "@/components/query-view";
import { Screen } from "@/components/screen";
import { SegmentedControl } from "@/components/segmented-control";
import { useRefresh } from "@/hooks/use-refresh";

const kinds = [
  { id: "battery", label: "Battery" },
  { id: "stats", label: "Stats" },
  { id: "places", label: "Places" },
] as const;

function isKind(value: unknown): value is InsightKind {
  return kinds.some((entry) => entry.id === value);
}

function Insights({ initialKind }: { initialKind: InsightKind }) {
  const router = useRouter();
  const { car } = useCar();
  const [kind, setKind] = useState<InsightKind>(initialKind);
  const [period, setPeriod] = useState<PeriodId | null>(null);
  const insight = useInsight(car.id, kind, period);
  const refresh = useRefresh(insight);
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <SegmentedControl
        label="Insight"
        items={kinds}
        value={kind}
        onChange={setKind}
      />
      {kind === "stats" ? (
        <LinkRow
          icon={icons.year}
          title="Year in review"
          subtitle="Totals, records, and top places of one year"
          onPress={() => router.push("/insights/year")}
        />
      ) : null}
      <QueryView query={insight}>
        {(page) => (
          <InsightBody
            subtitle={page.subtitle}
            hero={page.hero}
            heroBlocks={page.heroBlocks}
            sections={page.sections}
            stack="insights"
            period={<PeriodControl page={page} onChange={setPeriod} />}
            dimmed={insight.isPlaceholderData}
          />
        )}
      </QueryView>
    </Screen>
  );
}

export default function InsightsScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const initialKind = isKind(kind) ? kind : "battery";
  return <Insights key={initialKind} initialKind={initialKind} />;
}
