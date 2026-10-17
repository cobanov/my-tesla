import { useLocalSearchParams } from "expo-router";
import { ChargeScreen } from "@/screens/charge-screen";

export default function ChargeScreenRoute() {
  const { chargeId } = useLocalSearchParams<{ chargeId: string }>();
  return <ChargeScreen chargeId={chargeId} />;
}
