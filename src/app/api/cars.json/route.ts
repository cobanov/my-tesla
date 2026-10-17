import { connection } from "next/server";
import type { CarList } from "@/lib/app/contract";
import { defaultCarId, listCars } from "@/lib/queries";
import { carIdentity } from "@/lib/summary";

export async function GET() {
  await connection();
  const [cars, defaultId] = await Promise.all([listCars(), defaultCarId()]);
  return Response.json(
    { cars: cars.map(carIdentity), defaultCarId: defaultId } satisfies CarList,
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
