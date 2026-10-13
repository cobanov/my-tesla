const letterSpellings: Record<string, string> = {
  ı: "i",
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  đ: "d",
  ł: "l",
  þ: "th",
};

const numericId = /^\d{1,5}$/;

export type SluggedCar = { id: number; name: string };

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ıßæœøđłþ]/g, (letter) => letterSpellings[letter] ?? letter)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function carSlugs(cars: readonly SluggedCar[]): Map<number, string> {
  const bases = new Map(cars.map((car) => [car.id, slugify(car.name)]));
  const counts = new Map<string, number>();
  for (const base of bases.values()) {
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  return new Map(
    cars.map((car) => {
      const base = bases.get(car.id) ?? "";
      if (!base || numericId.test(base)) return [car.id, `car-${car.id}`];
      if ((counts.get(base) ?? 0) > 1) return [car.id, `${base}-${car.id}`];
      return [car.id, base];
    }),
  );
}

export function carPath(car: { slug: string }, segment = ""): string {
  return `/cars/${car.slug}${segment}`;
}

export function findCarByParam<Car extends { id: number; slug: string }>(
  cars: readonly Car[],
  param: string,
): Car | null {
  const bySlug = cars.find((car) => car.slug === param);
  if (bySlug) return bySlug;
  if (!numericId.test(param)) return null;
  return cars.find((car) => car.id === Number(param)) ?? null;
}

export function canonicalCarPath(pathname: string, slug: string): string {
  return pathname.replace(/^\/cars\/[^/]+/, `/cars/${slug}`);
}
