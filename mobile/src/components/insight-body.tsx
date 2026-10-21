import type {
  AppBlock,
  AppSection,
  AppStat,
  InsightPage,
  PeriodId,
} from "@contract";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { TabStack } from "@/navigation/targets";
import { space } from "@/theme/tokens";
import { Block } from "./blocks";
import { MapSection } from "./map";
import { Panel } from "./panel";
import { SegmentedControl } from "./segmented-control";
import { StatGrid } from "./stat";
import { Text } from "./text";

export function PeriodControl({
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

function isMap(block: AppBlock): boolean {
  return block.kind === "map" || block.kind === "routes";
}

function Section({
  section,
  stack,
  period,
}: {
  section: AppSection;
  stack: TabStack;
  period: ReactNode;
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
      {section.period ? period : null}
      {section.panels.map((panel) =>
        panel.blocks.some(isMap) ? (
          <MapSection key={panel.title} title={panel.title}>
            {panel.blocks.map((block, index) => (
              <Block key={index} block={block} stack={stack} />
            ))}
          </MapSection>
        ) : (
          <Panel key={panel.title} title={panel.title} note={panel.note}>
            {panel.blocks.map((block, index) => (
              <Block key={index} block={block} stack={stack} />
            ))}
          </Panel>
        ),
      )}
    </View>
  );
}

export function InsightBody({
  subtitle,
  hero,
  heroBlocks,
  sections,
  stack,
  period,
  dimmed,
}: {
  subtitle: string | null;
  hero: AppStat[];
  heroBlocks: AppBlock[];
  sections: AppSection[];
  stack: TabStack;
  period: ReactNode;
  dimmed: boolean;
}) {
  const sectionPeriod = sections.some((section) => section.period);
  return (
    <View style={[styles.content, dimmed && styles.dimmed]}>
      {subtitle ? <Text variant="label">{subtitle}</Text> : null}
      {sectionPeriod ? null : period}
      <StatGrid stats={hero} size="title" />
      {heroBlocks.map((block, index) => (
        <Block key={index} block={block} stack={stack} />
      ))}
      {sections.map((section, index) => (
        <Section
          key={section.title ?? index}
          section={section}
          stack={stack}
          period={period}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  dimmed: { opacity: 0.6 },
  section: { gap: space.lg, marginTop: space.lg },
  sectionHeading: { gap: space.xs },
});
