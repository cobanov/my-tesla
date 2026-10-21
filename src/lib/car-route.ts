import "server-only";
import { notFound, redirect } from "next/navigation";
import { currentSession } from "./auth/session";
import { findCarByParam } from "./car-slug";
import { isDemoMode } from "./demo/mode";
import { listCars } from "./queries";

export async function requireCar(params: Promise<{ carId: string }>) {
  if (!isDemoMode() && !(await currentSession())) redirect("/login");
  const { carId } = await params;
  const car = findCarByParam(await listCars(), carId);
  if (!car) notFound();
  return car;
}
