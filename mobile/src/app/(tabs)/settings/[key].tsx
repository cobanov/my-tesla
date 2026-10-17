import type { SettingItem, SettingsPage } from "@contract";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSettingChange, useSettings, useSettingsBusy } from "@/api/queries";
import { Icon } from "@/components/icon";
import { icons } from "@/components/icons";
import { ListRow } from "@/components/list-row";
import { EmptyState, QueryView } from "@/components/query-view";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { usePalette } from "@/theme/use-palette";

const searchFrom = 12;

type ChoiceItem = Extract<SettingItem, { kind: "choice" }>;

function Choices({ item }: { item: ChoiceItem }) {
  const palette = usePalette();
  const change = useSettingChange();
  const busy = useSettingsBusy();
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const options = query
    ? item.options.filter((option) =>
        option.label.toLowerCase().includes(query),
      )
    : item.options;
  return (
    <>
      <Stack.Screen options={{ title: item.label }} />
      {item.options.length > searchFrom ? (
        <Stack.SearchBar
          placeholder="Search"
          hideWhenScrolling={false}
          onChangeText={(event) => setSearch(event.nativeEvent.text)}
        />
      ) : null}
      {item.hint ? <Text variant="label">{item.hint}</Text> : null}
      {change.error ? (
        <Text variant="label" tone="destructive">
          {change.error.message}
        </Text>
      ) : null}
      <View>
        {options.map((option) => {
          const selected = option.id === item.value;
          return (
            <ListRow
              key={option.id}
              label={option.label}
              title={option.label}
              selected={selected}
              disabled={busy}
              end={
                selected ? (
                  <Icon name={icons.check} color={palette.foreground} />
                ) : null
              }
              onPress={() => {
                if (!selected)
                  change.mutate({ key: item.key, value: option.id });
              }}
            />
          );
        })}
      </View>
      {!options.length ? (
        <EmptyState title="No match" text={`Nothing matches “${search}”.`} />
      ) : null}
    </>
  );
}

function SettingChoices({
  page,
  settingKey,
}: {
  page: SettingsPage;
  settingKey: string;
}) {
  const item = page.groups
    .flatMap((group) => group.items)
    .find((entry) => entry.key === settingKey);
  if (item?.kind !== "choice") {
    return (
      <EmptyState
        title="Setting not found"
        text="Update My Tesla on the server, then try again."
      />
    );
  }
  return <Choices item={item} />;
}

export default function SettingChoiceScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const settings = useSettings();
  return (
    <Screen>
      <QueryView query={settings}>
        {(page) => <SettingChoices page={page} settingKey={key} />}
      </QueryView>
    </Screen>
  );
}
