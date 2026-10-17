import { connection } from "next/server";
import type { CarList } from "@/lib/app/contract";
import { defaultCarId, listCars } from "@/lib/queries";
import { carIdentity } from "@/lib/summary";
import { apiUnauthorized } from "@/lib/auth/session";

export async function GET() {
  await connection();
  const denied = await apiUnauthorized();
  if (denied) return denied;
  const [cars, defaultId] = await Promise.all([listCars(), defaultCarId()]);
  return Response.json(
    { cars: cars.map(carIdentity), defaultCarId: defaultId } satisfies CarList,
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
