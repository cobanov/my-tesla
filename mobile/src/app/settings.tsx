import { useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator } from "react-native";
import { forgetAlerts, useAlertChoices } from "@/alerts/use-alerts";
import { usePushCatalog } from "@/api/queries";
import type { PushEvent } from "@contract";
import { Button } from "@/components/button";
import { Panel } from "@/components/panel";
import { Screen } from "@/components/screen";
import { SwitchRow } from "@/components/switch-row";
import { Text } from "@/components/text";
import {
  useConnection,
  useConnectionState,
} from "@/connection/connection-provider";
import { usePalette } from "@/theme/use-palette";

function AlertSwitches({ events }: { events: readonly PushEvent[] }) {
  const { chosen, update, test } = useAlertChoices(events);
  const busy = update.isPending || test.isPending;
  const toggle = (id: string, on: boolean) =>
    update.mutate(
      on ? [...chosen, id] : chosen.filter((entry) => entry !== id),
    );
  return (
    <>
      {events.map((event) => (
        <SwitchRow
          key={event.id}
          label={event.title}
          detail={event.description}
          value={chosen.includes(event.id)}
          disabled={busy}
          onChange={(on) => toggle(event.id, on)}
        />
      ))}
      {update.error || test.error ? (
        <Text variant="label" tone="destructive">
          {(update.error ?? test.error)?.message}
        </Text>
      ) : null}
      {test.isSuccess ? (
        <Text variant="label">The server sent a test alert.</Text>
      ) : null}
      <Button
        label="Send a test alert"
        kind="secondary"
        busy={test.isPending}
        disabled={!chosen.length}
        onPress={() => test.mutate()}
      />
    </>
  );
}

function Alerts() {
  const palette = usePalette();
  const catalog = usePushCatalog();
  if (catalog.isPending) return <ActivityIndicator color={palette.subtle} />;
  if (catalog.error) return <Text>{catalog.error.message}</Text>;
  if (!catalog.data.enabled) {
    return (
      <Text>The server sends alerts only with the TeslaMate MQTT feed.</Text>
    );
  }
  return <AlertSwitches events={catalog.data.events} />;
}

export default function SettingsScreen() {
  const connection = useConnection();
  const { forget } = useConnectionState();
  const queryClient = useQueryClient();
  return (
    <Screen>
      <Panel title="Alerts">
        <Alerts />
      </Panel>
      <Panel title="Display">
        <Text>
          Units, formats, the time zone, and the Overview cards follow Settings
          on the web for the same login.
        </Text>
      </Panel>
      <Panel title="Server">
        <Text numberOfLines={1}>{connection.url}</Text>
        <Text variant="caption">
          {connection.clientId
            ? "With a Cloudflare Access service token"
            : "Without a token"}
        </Text>
        <Button
          label="Disconnect"
          kind="secondary"
          onPress={async () => {
            await forgetAlerts(connection);
            await forget();
            queryClient.clear();
          }}
        />
      </Panel>
    </Screen>
  );
}
