import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/server/supabase";
import { getProfileJsonFromSupabase } from "@/lib/server/supabaseProfile";

function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase Auth environment is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "MediLocker Vault Access",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isNewUser: { label: "Is New User", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const email = credentials.email.toLowerCase().trim();
        const { data, error } = await authClient().auth.signInWithPassword({
          email,
          password: credentials.password,
        });
        if (error || !data.user) return null;
        const profile = await getProfileJsonFromSupabase(email);
        return {
          id: data.user.id,
          name: profile?.name || data.user.user_metadata?.name || "Patient",
          email,
          roles: [profile?.basicDetails ? "patient" : "patient"],
          isNewUser: credentials.isNewUser === "true" || !profile?.onboarding?.completed,
          onboardingCompleted: Boolean(profile?.onboarding?.completed),
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 4 * 60 * 60 },
  jwt: { maxAge: 4 * 60 * 60 },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "update" && session) {
        if (typeof session.onboardingCompleted === "boolean") (token as any).onboardingCompleted = session.onboardingCompleted;
        if (typeof session.isNewUser === "boolean") (token as any).isNewUser = session.isNewUser;
        if (session.name) token.name = session.name;
        return token;
      }
      if (user && account?.provider === "google") {
        const email = user.email?.toLowerCase().trim();
        if (!email) throw new Error("Google account did not provide an email");
        const existing = await supabaseAdmin().from("profiles").select("id,data,role").eq("email", email).maybeSingle();
        let authUserId = existing.data?.id;
        if (!authUserId) {
          const created = await supabaseAdmin().auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { name: user.name || "Patient", role: "patient" },
          });
          if (created.error || !created.data.user) throw created.error || new Error("Unable to create Supabase Auth user");
          authUserId = created.data.user.id;
        }
        const profile = await getProfileJsonFromSupabase(email);
        (token as any).id = authUserId;
        (token as any).isNewUser = !profile?.onboarding?.completed;
        (token as any).onboardingCompleted = Boolean(profile?.onboarding?.completed);
      }
      if (user && account?.provider === "credentials") {
        (token as any).id = user.id;
        (token as any).isNewUser = (user as any).isNewUser;
        (token as any).onboardingCompleted = (user as any).onboardingCompleted;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).isNewUser = Boolean((token as any).isNewUser);
        (session.user as any).onboardingCompleted = Boolean((token as any).onboardingCompleted);
      }
      return session;
    },
  },
  pages: { signIn: "/auth" },
  secret: process.env.NEXTAUTH_SECRET,
};
