import { describe, expect, test } from "bun:test";
import {
  carList,
  chargeDetail,
  driveList,
  insightPage,
  overviewPage,
  pushCatalog,
  appMe,
  pairClaim,
  pairStatus,
  responseProblem,
  settingsPage,
} from "./responses";

const car = { id: 2, name: "Juniper", model: "Model Y", trim: "SR" };

describe("responseProblem", () => {
  test("explains the answers that hold no data", () => {
    expect(responseProblem(200, "application/json", null)).toBeNull();
    expect(responseProblem(204, null, null)).toBeNull();
    expect(responseProblem(403, "text/plain", null)).toContain(
      "Pair this phone",
    );
    expect(responseProblem(200, "text/html", null)).toContain("login page");
    expect(
      responseProblem(
        409,
        "application/json",
        "Push alerts need the MQTT feed.",
      ),
    ).toBe("Push alerts need the MQTT feed.");
    expect(responseProblem(503, "application/json", null)).toContain("failed");
  });
});

describe("carList", () => {
  test("takes the cars of a My Tesla server only", () => {
    expect(carList({ cars: [car], defaultCarId: 2 })).toEqual({
      cars: [car],
      defaultCarId: 2,
    });
    expect(carList({ cars: [car] })).toEqual({
      cars: [car],
      defaultCarId: null,
    });
    expect(carList({ cars: [{ id: "2" }] })).toBeNull();
    expect(carList({ status: "ok" })).toBeNull();
  });
});

describe("pushCatalog", () => {
  test("checks the alert list", () => {
    const events = [
      { id: "tire-warning", title: "Tire pressure", description: "A tire." },
    ];
    expect(pushCatalog({ enabled: true, events })).toEqual({
      enabled: true,
      events,
    });
    expect(pushCatalog({ enabled: "yes", events })).toBeNull();
    expect(pushCatalog({ enabled: true, events: [{ id: 1 }] })).toBeNull();
  });
});

describe("screen shapes", () => {
  test("accept the parts each screen reads first", () => {
    expect(driveList({ summary: [], sections: [] })).not.toBeNull();
    expect(driveList({ summary: [] })).toBeNull();
    expect(
      overviewPage({ car, activity: { label: "Online" }, stats: [] }),
    ).not.toBeNull();
    expect(overviewPage({ car })).toBeNull();
    expect(
      chargeDetail({ title: "Home", hero: [], charts: [] }),
    ).not.toBeNull();
    expect(chargeDetail({ title: 4, hero: [], charts: [] })).toBeNull();
    expect(
      insightPage({ title: "Battery", hero: [], sections: [] }),
    ).not.toBeNull();
    expect(insightPage([])).toBeNull();
  });

  test("checks each settings group and the choices of a choice item", () => {
    const item = { key: "distance", label: "Distance", kind: "choice" };
    expect(
      settingsPage({
        preview: [],
        groups: [{ title: "Units", items: [{ ...item, options: [] }] }],
      }),
    ).not.toBeNull();
    expect(
      settingsPage({
        preview: [],
        groups: [{ title: "Units", items: [item] }],
      }),
    ).toBeNull();
    expect(settingsPage({ preview: [], groups: [null] })).toBeNull();
  });

  test("check the sign-in answers of pairing", () => {
    const user = { name: "Ege", email: "ege@example.com", role: "admin" };
    expect(
      pairClaim({ token: "t", status: "pending", user: { name: "Ege" } }),
    ).not.toBeNull();
    expect(pairClaim({ token: "t", status: "active", user: {} })).toBeNull();
    expect(pairStatus({ status: "active", user })).not.toBeNull();
    expect(
      pairStatus({ status: "active", user: { ...user, role: "x" } }),
    ).toBeNull();
    expect(appMe({ user, device: { name: null } })).not.toBeNull();
    expect(appMe({ user })).toBeNull();
  });
});
