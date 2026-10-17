import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireCar } from "@/lib/car-route";
import { listCars } from "@/lib/queries";
import { readTimeZone } from "@/lib/time-zone";
import { currentSession } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo/mode";
import { baseline, getPreferences } from "@/lib/viewer";

export const instant = false;

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  params,
}: PageProps<"/cars/[carId]/settings">) {
  const [car, preferences, defaults, cars, signedIn] = await Promise.all([
    requireCar(params),
    getPreferences(),
    baseline(),
    listCars(),
    currentSession(),
  ]);

  return (
    <PageTransition>
      <SettingsForm
        initial={preferences}
        defaults={defaults}
        car={{ id: car.id, name: car.name }}
        demo={isDemoMode()}
        cars={cars.map((car) => ({ id: car.id, name: car.name }))}
        timeZones={Intl.supportedValuesOf("timeZone")}
        serverTimeZone={readTimeZone(process.env)}
        viewer={signedIn?.user.email ?? null}
      />
    </PageTransition>
  );
}
