import "server-only";
import { notFound } from "next/navigation";
import { findCarByParam } from "./car-slug";
import { listCars } from "./queries";

export async function requireCar(params: Promise<{ carId: string }>) {
  const { carId } = await params;
  const car = findCarByParam(await listCars(), carId);
  if (!car) notFound();
  return car;
}
