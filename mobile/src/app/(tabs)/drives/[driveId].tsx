import { useLocalSearchParams } from "expo-router";
import { DriveScreen } from "@/screens/drive-screen";

export default function DriveScreenRoute() {
  const { driveId } = useLocalSearchParams<{ driveId: string }>();
  return <DriveScreen driveId={driveId} />;
}
