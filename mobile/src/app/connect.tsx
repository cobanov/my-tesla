import { useMutation } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { ApiError, request } from "@/api/client";
import { carList } from "@/api/responses";
import { rememberCar } from "@/car/car-provider";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { useConnectionState } from "@/connection/connection-provider";
import { connectionOf, pairingOf } from "@/connection/server";
import { space } from "@/theme/tokens";

const demoUrl = "https://mytesla.chele.bi";

type ConnectInput = {
  url: string;
  clientId: string;
  clientSecret: string;
  carId: number | null;
};

export default function ConnectScreen() {
  const { save } = useConnectionState();
  const [url, setUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scanProblem, setScanProblem] = useState<string | null>(null);
  const [, requestCamera] = useCameraPermissions();
  const scanning = useRef(false);
  const connect = useMutation({
    mutationFn: async (input: ConnectInput) => {
      const connection = connectionOf(input);
      if (!connection) {
        throw new ApiError(
          "Type the server address, and both token values or none.",
        );
      }
      if (!carList(await request(connection, "/api/cars.json"))) {
        throw new ApiError("The server is not a My Tesla server.");
      }
      if (input.carId !== null) await rememberCar(input.carId);
      await save(connection);
    },
  });
  const { mutate } = connect;
  const typed = { url, clientId, clientSecret, carId: null };

  useEffect(() => {
    const subscription = CameraView.onModernBarcodeScanned(({ data }) => {
      if (!scanning.current) return;
      scanning.current = false;
      if (Platform.OS === "ios") CameraView.dismissScanner().catch(() => null);
      const pairing = pairingOf(data);
      if (!pairing) {
        setScanProblem(
          "This code is not from My Tesla. On the web, open Settings, then Mobile app, and show the code.",
        );
        return;
      }
      const { connection, carId } = pairing;
      setUrl(connection.url);
      setClientId(connection.clientId ?? "");
      setClientSecret(connection.clientSecret ?? "");
      mutate({
        url: connection.url,
        clientId: connection.clientId ?? "",
        clientSecret: connection.clientSecret ?? "",
        carId,
      });
    });
    return () => subscription.remove();
  }, [mutate]);

  const scan = async () => {
    setScanProblem(null);
    connect.reset();
    if (Platform.OS === "ios" && !(await requestCamera()).granted) {
      setScanProblem("Allow the camera for My Tesla in the phone settings.");
      return;
    }
    scanning.current = true;
    try {
      await CameraView.launchScanner({ barcodeTypes: ["qr"] });
    } catch {
      scanning.current = false;
      setScanProblem("This phone cannot scan codes. Type the address below.");
    }
  };

  const problem = scanProblem ?? connect.error?.message;
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
      <Button
        label="Scan the code"
        kind="secondary"
        disabled={connect.isPending}
        onPress={scan}
      />
      <Text variant="caption">
        On the web, open Settings, then Mobile app, and show the code. Or type
        the address below.
      </Text>
      <Field
        label="Server address"
        placeholder="https://tesla.example.com"
        keyboardType="url"
        textContentType="URL"
        returnKeyType="go"
        value={url}
        onChangeText={setUrl}
        onSubmitEditing={() => connect.mutate(typed)}
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
        onSubmitEditing={() => connect.mutate(typed)}
      />
      <Text variant="caption">
        Behind Cloudflare Access, add a service token. Leave both empty on a
        private network.
      </Text>
      {problem ? (
        <Text variant="label" tone="destructive">
          {problem}
        </Text>
      ) : null}
      <Button
        label="Connect"
        busy={connect.isPending}
        onPress={() => connect.mutate(typed)}
      />
      <Button
        label="Open the demo"
        kind="secondary"
        disabled={connect.isPending}
        onPress={() =>
          connect.mutate({
            url: demoUrl,
            clientId: "",
            clientSecret: "",
            carId: null,
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space.sm, marginTop: space.xxl, marginBottom: space.lg },
});
