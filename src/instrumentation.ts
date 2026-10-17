export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startPushAlerts } = await import("./lib/push/alerts");
  startPushAlerts();
}
