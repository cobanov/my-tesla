import type { PeriodId } from "@contract";
import { useRouter } from "expo-router";
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
import { useInsightRequest } from "@/navigation/insight-request";

const kinds = [
  { id: "battery", label: "Battery" },
  { id: "stats", label: "Stats" },
  { id: "places", label: "Places" },
] as const;

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
  const request = useInsightRequest();
  return <Insights key={request.count} initialKind={request.kind} />;
}
