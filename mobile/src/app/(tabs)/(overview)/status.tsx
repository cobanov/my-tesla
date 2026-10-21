import type { AppStat, OverviewPage } from "@contract";
import { useRouter } from "expo-router";
import { useLiveChanges } from "@/api/live";
import { useOverview } from "@/api/queries";
import { useCar } from "@/car/car-provider";
import { Button } from "@/components/button";
import { DayStrip } from "@/components/day-strip";
import { LivePanel } from "@/components/live-tiles";
import { LockHistory } from "@/components/lock-history";
import { Notice } from "@/components/notice";
import { Panel } from "@/components/panel";
import { EmptyState, QueryView } from "@/components/query-view";
import { Screen } from "@/components/screen";
import { StatGrid } from "@/components/stat";
import { useRefresh } from "@/hooks/use-refresh";

function Tires({ tires }: { tires: NonNullable<OverviewPage["tires"]> }) {
  const stats: AppStat[] = [
    { label: "Front left", value: tires.frontLeft, detail: null },
    { label: "Front right", value: tires.frontRight, detail: null },
    { label: "Rear left", value: tires.rearLeft, detail: null },
    { label: "Rear right", value: tires.rearRight, detail: null },
  ];
  return (
    <Panel title="Tire pressure">
      <StatGrid stats={stats} />
      {tires.warnings.map((warning) => (
        <Notice key={warning} text={warning} />
      ))}
    </Panel>
  );
}

function TodayPanel({ today }: { today: NonNullable<OverviewPage["today"]> }) {
  const router = useRouter();
  return (
    <Panel title="Today">
      <DayStrip today={today} label="Today, hour by hour" />
      <Button
        label="Timeline"
        kind="secondary"
        onPress={() => router.push("/drives/timeline", { withAnchor: true })}
      />
    </Panel>
  );
}

export default function StatusScreen() {
  const { car } = useCar();
  const overview = useOverview(car.id);
  useLiveChanges(car.id, ["overview", car.id]);
  const refresh = useRefresh(overview);
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <QueryView query={overview}>
        {(page) => (
          <>
            {page.live ? <LivePanel live={page.live} /> : null}
            {page.history ? <LockHistory history={page.history} /> : null}
            {page.today ? <TodayPanel today={page.today} /> : null}
            {page.tires ? <Tires tires={page.tires} /> : null}
            {page.stats.length ? (
              <Panel title="Car">
                <StatGrid stats={page.stats} />
              </Panel>
            ) : null}
            {!page.live && !page.history && !page.tires ? (
              <EmptyState
                title="No status yet"
                text={`TeslaMate fills this page after ${car.name} sends its first values.`}
              />
            ) : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
}
