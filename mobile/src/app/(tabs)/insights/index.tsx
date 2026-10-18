import type { PeriodId } from "@contract";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useInsight, type InsightKind } from "@/api/queries";
import { useCar } from "@/car/car-provider";
import { InsightBody, PeriodControl } from "@/components/insight-body";
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

export default function InsightsScreen() {
  const router = useRouter();
  const { car } = useCar();
  const [kind, setKind] = useState<InsightKind>("battery");
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
