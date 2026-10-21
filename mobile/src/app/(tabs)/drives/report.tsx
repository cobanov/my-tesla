import { Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useReport } from "@/api/queries";
import { useCar } from "@/car/car-provider";
import { DriveListRow } from "@/components/drive-row";
import { ExportButton } from "@/components/export-button";
import { MapSection, RouteMap } from "@/components/map";
import { QueryView } from "@/components/query-view";
import { Screen } from "@/components/screen";
import { SectionHeading } from "@/components/section-heading";
import { SegmentedControl } from "@/components/segmented-control";
import { StatGrid } from "@/components/stat";
import { Text } from "@/components/text";
import { useRefresh } from "@/hooks/use-refresh";
import { space } from "@/theme/tokens";

const shortLabels: Record<string, string> = {
  "Last 7 days": "7 days",
  "Last 30 days": "30 days",
  "This month": "Month",
  "This year": "Year",
};

export default function ReportScreen() {
  const { car } = useCar();
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const report = useReport(car.id, range);
  const refresh = useRefresh(report);
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <Stack.Screen options={{ title: "Report" }} />
      <QueryView query={report}>
        {(page) => {
          const chosen =
            page.presets.find(
              (preset) => preset.from === page.from && preset.to === page.to,
            ) ?? null;
          return (
            <View
              style={[
                styles.content,
                report.isPlaceholderData && styles.dimmed,
              ]}
            >
              {page.subtitle ? (
                <Text variant="label">{page.subtitle}</Text>
              ) : null}
              <SegmentedControl
                label="Range"
                size="compact"
                items={page.presets.map((preset) => ({
                  id: `${preset.from}/${preset.to}`,
                  label: shortLabels[preset.label] ?? preset.label,
                }))}
                value={chosen ? `${chosen.from}/${chosen.to}` : ""}
                onChange={(id) => {
                  const [from = "", to = ""] = id.split("/");
                  setRange({ from, to });
                }}
              />
              {page.notice ? (
                <Text variant="label" tone="subtle">
                  {page.notice}
                </Text>
              ) : null}
              <StatGrid stats={page.stats} />
              {page.routes && page.routes.length ? (
                <MapSection title="Routes">
                  <RouteMap
                    routes={page.routes}
                    markers={page.markers}
                    label="The routes of the range"
                  />
                </MapSection>
              ) : null}
              {page.sections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <SectionHeading title={section.title} />
                  {section.rows.map((row) => (
                    <DriveListRow key={row.key} row={row} stack="drives" />
                  ))}
                </View>
              ))}
              {page.exports.map((item) => (
                <ExportButton key={item.path} item={item} />
              ))}
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  dimmed: { opacity: 0.6 },
  section: { gap: 2 },
});
