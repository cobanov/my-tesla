import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { readAnalyticsConfig } from "@/lib/analytics";
import { Landing } from "@/components/landing/landing";
import { carPath } from "@/lib/car-slug";
import { isDemoMode } from "@/lib/demo/mode";
import { repositoryStars } from "@/lib/github";
import { project } from "@/lib/project";
import { autoCar } from "@/lib/preferences";
import {
  siteDescription,
  siteTagline,
  siteUrl,
  softwareApplication,
} from "@/lib/site";
import { defaultCarId, listCars } from "@/lib/queries";
import { getPreferences } from "@/lib/viewer";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  if (!isDemoMode()) return {};
  return {
    title: { absolute: `${project.name} · ${siteTagline}` },
    description: `${siteDescription} Try the demo with 60 days of synthetic data.`,
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
  };
}

async function startCarPath(): Promise<string | null> {
  const [{ defaultCar }, cars] = await Promise.all([
    getPreferences(),
    listCars(),
  ]);
  const chosen =
    defaultCar === autoCar
      ? undefined
      : cars.find((car) => String(car.id) === defaultCar);
  const id = chosen?.id ?? (await defaultCarId());
  const car = cars.find((option) => option.id === id);
  return car ? carPath(car) : null;
}

export default async function Home() {
  await connection();
  if (isDemoMode()) {
    const structuredData = softwareApplication(siteUrl(process.env));
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <Landing
          stars={await repositoryStars()}
          counted={readAnalyticsConfig(process.env) !== null}
        />
      </>
    );
  }
  const path = await startCarPath();
  if (path !== null) redirect(path);
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-5">
      <EmptyState title="No cars yet">
        Sign in to TeslaMate with your Tesla account. Your cars appear here
        after TeslaMate finds them.
      </EmptyState>
    </main>
  );
}
