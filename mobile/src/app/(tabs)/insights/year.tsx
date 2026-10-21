import { Stack } from "expo-router";
import { useState } from "react";
import { useYear } from "@/api/queries";
import { useCar } from "@/car/car-provider";
import { InsightBody } from "@/components/insight-body";
import { QueryView } from "@/components/query-view";
import { Screen } from "@/components/screen";
import { SegmentedControl } from "@/components/segmented-control";
import { useRefresh } from "@/hooks/use-refresh";

export default function YearScreen() {
  const { car } = useCar();
  const [year, setYear] = useState<number | null>(null);
  const review = useYear(car.id, year);
  const refresh = useRefresh(review);
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <Stack.Screen options={{ title: "Year in review" }} />
      <QueryView query={review}>
        {(page) => (
          <InsightBody
            subtitle={page.subtitle}
            hero={page.hero}
            heroBlocks={page.heroBlocks}
            sections={page.sections}
            stack="insights"
            dimmed={review.isPlaceholderData}
            period={
              page.year !== null && page.years.length > 1 ? (
                <SegmentedControl
                  label="Year"
                  size="compact"
                  items={page.years.slice(0, 5).map((option) => ({
                    id: String(option),
                    label: String(option),
                  }))}
                  value={String(page.year)}
                  onChange={(next) => setYear(Number(next))}
                />
              ) : null
            }
          />
        )}
      </QueryView>
    </Screen>
  );
}
