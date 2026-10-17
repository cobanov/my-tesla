import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ApiError, request } from "@/api/client";
import { carList } from "@/api/responses";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { useConnectionState } from "@/connection/connection-provider";
import { connectionOf } from "@/connection/server";
import { space } from "@/theme/tokens";

const demoUrl = "https://mytesla.chele.bi";

export default function ConnectScreen() {
  const { save } = useConnectionState();
  const [url, setUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const connect = useMutation({
    mutationFn: async (address: string) => {
      const connection = connectionOf({ url: address, clientId, clientSecret });
      if (!connection) {
        throw new ApiError(
          "Type the server address, and both token values or none.",
        );
      }
      if (!carList(await request(connection, "/api/cars.json"))) {
        throw new ApiError("The server is not a My Tesla server.");
      }
      await save(connection);
    },
  });

  return (
    <Screen>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          My Tesla
        </Text>
        <Text variant="label">
          Connect to the My Tesla server that reads your TeslaMate data.
        </Text>
      </View>
      <Field
        label="Server address"
        placeholder="https://tesla.example.com"
        keyboardType="url"
        textContentType="URL"
        returnKeyType="go"
        value={url}
        onChangeText={setUrl}
        onSubmitEditing={() => connect.mutate(url)}
      />
      <Field
        label="Access client ID"
        value={clientId}
        onChangeText={setClientId}
      />
      <Field
        label="Access client secret"
        secureTextEntry
        returnKeyType="go"
        value={clientSecret}
        onChangeText={setClientSecret}
        onSubmitEditing={() => connect.mutate(url)}
      />
      <Text variant="caption">
        Behind Cloudflare Access, add a service token. Leave both empty on a
        private network.
      </Text>
      {connect.error ? (
        <Text variant="label" tone="destructive">
          {connect.error.message}
        </Text>
      ) : null}
      <Button
        label="Connect"
        busy={connect.isPending}
        onPress={() => connect.mutate(url)}
      />
      <Button
        label="Open the demo"
        kind="secondary"
        disabled={connect.isPending}
        onPress={() => connect.mutate(demoUrl)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space.sm, marginTop: space.xxl, marginBottom: space.lg },
});
