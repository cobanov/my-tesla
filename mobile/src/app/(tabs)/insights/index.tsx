import type { AppSection, InsightPage, PeriodId } from "@contract";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useInsight, type InsightKind } from "@/api/queries";
import { useCar } from "@/car/car-provider";
import { Block } from "@/components/blocks";
import { Panel } from "@/components/panel";
import { QueryView } from "@/components/query-view";
import { Screen } from "@/components/screen";
import { SegmentedControl } from "@/components/segmented-control";
import { StatGrid } from "@/components/stat";
import { Text } from "@/components/text";
import { useRefresh } from "@/hooks/use-refresh";
import { space } from "@/theme/tokens";

const kinds = [
  { id: "battery", label: "Battery" },
  { id: "stats", label: "Stats" },
  { id: "places", label: "Places" },
] as const;

function PeriodControl({
  page,
  onChange,
}: {
  page: InsightPage;
  onChange: (period: PeriodId) => void;
}) {
  return (
    <SegmentedControl
      label="Period"
      size="compact"
      items={page.periods}
      value={page.period}
      onChange={onChange}
    />
  );
}

function Section({
  section,
  page,
  onPeriod,
}: {
  section: AppSection;
  page: InsightPage;
  onPeriod: (period: PeriodId) => void;
}) {
  return (
    <View style={styles.section}>
      {section.title ? (
        <View style={styles.sectionHeading}>
          <Text variant="heading" accessibilityRole="header">
            {section.title}
          </Text>
          {section.subtitle ? (
            <Text variant="label">{section.subtitle}</Text>
          ) : null}
        </View>
      ) : null}
      {section.period ? (
        <PeriodControl page={page} onChange={onPeriod} />
      ) : null}
      {section.panels.map((panel) => (
        <Panel key={panel.title} title={panel.title} note={panel.note}>
          {panel.blocks.map((block, index) => (
            <Block key={index} block={block} stack="insights" />
          ))}
        </Panel>
      ))}
    </View>
  );
}

function InsightContent({
  page,
  dimmed,
  onPeriod,
}: {
  page: InsightPage;
  dimmed: boolean;
  onPeriod: (period: PeriodId) => void;
}) {
  const sectionPeriod = page.sections.some((section) => section.period);
  return (
    <View style={[styles.content, dimmed && styles.dimmed]}>
      {page.subtitle ? <Text variant="label">{page.subtitle}</Text> : null}
      {sectionPeriod ? null : <PeriodControl page={page} onChange={onPeriod} />}
      <StatGrid stats={page.hero} size="title" />
      {page.heroBlocks.map((block, index) => (
        <Block key={index} block={block} stack="insights" />
      ))}
      {page.sections.map((section, index) => (
        <Section
          key={section.title ?? index}
          section={section}
          page={page}
          onPeriod={onPeriod}
        />
      ))}
    </View>
  );
}

export default function InsightsScreen() {
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
      <QueryView query={insight}>
        {(page) => (
          <InsightContent
            page={page}
            dimmed={insight.isPlaceholderData}
            onPeriod={setPeriod}
          />
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  dimmed: { opacity: 0.6 },
  section: { gap: space.lg, marginTop: space.lg },
  sectionHeading: { gap: space.xs },
});
