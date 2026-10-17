import { useLocalSearchParams } from "expo-router";
import { TripScreen } from "@/screens/trip-screen";

export default function TripScreenRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <TripScreen tripId={tripId} />;
}
