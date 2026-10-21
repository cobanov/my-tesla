import type { AppMe } from "@/lib/app/contract";
import { appJson } from "@/lib/app/request";
import { authStore, currentSession } from "@/lib/auth/session";

export async function GET() {
  const signedIn = await currentSession();
  if (!signedIn) return appJson({ error: "Sign in to My Tesla." }, 401);
  const { user, session } = signedIn;
  const body: AppMe = {
    user: { name: user.name, email: user.email, role: user.role },
    device: { name: session.name },
  };
  return appJson(body);
}

export async function DELETE() {
  const signedIn = await currentSession();
  if (signedIn) authStore().deleteSession(signedIn.session.id);
  return new Response(null, { status: 204 });
}
