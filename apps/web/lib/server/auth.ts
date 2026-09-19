import { createClient } from "@/utils/supabase/server";

export async function getIdentity() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      actorId: 'anon',
      role: 'anon',
      session: null,
      user: null
    };
  }

  return {
    actorId: user.id,
    role: "user", // Defaulting to user for now, as DB role can be checked elsewhere if needed
    session: { user: { id: user.id, email: user.email } },
    user: user
  };
}

export function buildOAuthRedirectUrl(provider: 'google' | 'github' | 'institution'): string {
  return '';
}
