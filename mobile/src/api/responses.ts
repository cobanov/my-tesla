import type {
  AppMe,
  AppUser,
  CarIdentity,
  CarList,
  ChargeDetail,
  ChargeList,
  DriveDetail,
  DriveList,
  InsightPage,
  OverviewPage,
  PairClaim,
  PairStatus,
  PushCatalog,
  SettingsPage,
  TripDetail,
} from "@contract";

type Shape = Record<string, unknown>;

export function responseProblem(
  status: number,
  contentType: string | null,
  serverMessage: string | null,
): string | null {
  if (status === 401 || status === 403) {
    return "The server refused the request. Pair this phone from Settings on the web.";
  }
  if (status === 404) {
    return "The server does not know this request. Update My Tesla on the server.";
  }
  if (status >= 400 && status < 500) {
    return serverMessage ?? `The server refused the request (${status}).`;
  }
  if (status >= 500) return "The server failed. Try again later.";
  if (status !== 204 && !contentType?.includes("application/json")) {
    return "The server answered with a login page. A proxy in front of My Tesla asks for its own login, so let the app through.";
  }
  return null;
}

function isRecord(value: unknown): value is Shape {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shaped<T>(value: unknown, test: (shape: Shape) => boolean): T | null {
  return isRecord(value) && test(value) ? (value as T) : null;
}

function isCar(value: unknown): value is CarIdentity {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    typeof value.model === "string"
  );
}

export function carList(value: unknown): CarList | null {
  if (!isRecord(value) || !Array.isArray(value.cars)) return null;
  if (!value.cars.every(isCar)) return null;
  const defaultCarId =
    typeof value.defaultCarId === "number" ? value.defaultCarId : null;
  return { cars: value.cars, defaultCarId };
}

export function pushCatalog(value: unknown): PushCatalog | null {
  if (!isRecord(value) || typeof value.enabled !== "boolean") return null;
  if (!Array.isArray(value.events)) return null;
  const valid = value.events.every(
    (event) =>
      isRecord(event) &&
      typeof event.id === "string" &&
      typeof event.title === "string" &&
      typeof event.description === "string",
  );
  return valid ? (value as PushCatalog) : null;
}

const listShape = (shape: Shape) =>
  Array.isArray(shape.summary) && Array.isArray(shape.sections);

export const overviewPage = (value: unknown) =>
  shaped<OverviewPage>(
    value,
    (shape) =>
      isRecord(shape.car) &&
      isRecord(shape.activity) &&
      Array.isArray(shape.stats),
  );

export const driveList = (value: unknown) =>
  shaped<DriveList>(value, listShape);

export const chargeList = (value: unknown) =>
  shaped<ChargeList>(value, listShape);

export const driveDetail = (value: unknown) =>
  shaped<DriveDetail>(
    value,
    (shape) =>
      typeof shape.title === "string" &&
      Array.isArray(shape.stats) &&
      Array.isArray(shape.charts),
  );

export const tripDetail = (value: unknown) =>
  shaped<TripDetail>(
    value,
    (shape) => typeof shape.title === "string" && Array.isArray(shape.steps),
  );

export const chargeDetail = (value: unknown) =>
  shaped<ChargeDetail>(
    value,
    (shape) =>
      typeof shape.title === "string" &&
      Array.isArray(shape.hero) &&
      Array.isArray(shape.charts),
  );

export const insightPage = (value: unknown) =>
  shaped<InsightPage>(
    value,
    (shape) =>
      typeof shape.title === "string" &&
      Array.isArray(shape.hero) &&
      Array.isArray(shape.sections),
  );

export const settingsPage = (value: unknown) =>
  shaped<SettingsPage>(
    value,
    (shape) =>
      Array.isArray(shape.preview) &&
      Array.isArray(shape.groups) &&
      shape.groups.every(
        (group) =>
          isRecord(group) &&
          typeof group.title === "string" &&
          Array.isArray(group.items) &&
          group.items.every(
            (item) =>
              isRecord(item) &&
              typeof item.key === "string" &&
              typeof item.label === "string" &&
              (item.kind !== "choice" || Array.isArray(item.options)),
          ),
      ),
  );

function isUser(value: unknown): value is AppUser {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    (value.role === "admin" || value.role === "member")
  );
}

export const pairClaim = (value: unknown) =>
  shaped<PairClaim>(
    value,
    (shape) =>
      typeof shape.token === "string" &&
      shape.status === "pending" &&
      isRecord(shape.user) &&
      typeof shape.user.name === "string",
  );

export const pairStatus = (value: unknown) =>
  shaped<PairStatus>(
    value,
    (shape) =>
      (shape.status === "pending" || shape.status === "active") &&
      isUser(shape.user),
  );

export const appMe = (value: unknown) =>
  shaped<AppMe>(value, (shape) => isUser(shape.user) && isRecord(shape.device));
