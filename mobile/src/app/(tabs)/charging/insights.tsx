import type { PeriodId } from "@contract";
import { Stack } from "expo-router";
import { useState } from "react";
import { useInsight } from "@/api/queries";
import { useCar } from "@/car/car-provider";
import { InsightBody, PeriodControl } from "@/components/insight-body";
import { QueryView } from "@/components/query-view";
import { Screen } from "@/components/screen";
import { useRefresh } from "@/hooks/use-refresh";

export default function ChargingInsightsScreen() {
  const { car } = useCar();
  const [period, setPeriod] = useState<PeriodId | null>(null);
  const insight = useInsight(car.id, "charging", period);
  const refresh = useRefresh(insight);
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <Stack.Screen options={{ title: "Charging insights" }} />
      <QueryView query={insight}>
        {(page) => (
          <InsightBody
            subtitle={page.subtitle}
            hero={page.hero}
            heroBlocks={page.heroBlocks}
            sections={page.sections}
            stack="charging"
            period={<PeriodControl page={page} onChange={setPeriod} />}
            dimmed={insight.isPlaceholderData}
          />
        )}
      </QueryView>
    </Screen>
  );
}
