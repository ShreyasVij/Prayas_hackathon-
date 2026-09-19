import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getCollection } from "@/lib/server/db";
import { sendWelcomeEmail } from "@/lib/server/emailHooks";
import { getProfileJsonFromSupabase, saveProfileJsonToSupabase } from "@/lib/server/supabaseProfile";

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
        if (!credentials?.email) return null;

        const email = credentials.email.toLowerCase().trim();
        const isSignUpFlag = credentials.isNewUser === "true";

        // Check Supabase Profile JSON
        const supabaseProfile = await getProfileJsonFromSupabase(email);

        try {
          const users = await getCollection<any>("users");
          const dbUser = await users.findOne({ email });

          if (dbUser) {
            // If password provided, verify password hash if present
            if (credentials.password && dbUser.passwordHash) {
              const valid = await bcrypt.compare(credentials.password, dbUser.passwordHash);
              if (!valid) {
                throw new Error("Invalid email or password");
              }
            }

            const onboardingDone = Boolean(
              supabaseProfile?.onboarding?.completed ??
              dbUser.onboardingCompleted ??
              dbUser.profile?.onboardingCompleted
            );

            return {
              id: dbUser._id.toString(),
              name: dbUser.name || supabaseProfile?.name || "Patient",
              email: dbUser.email,
              roles: dbUser.roles || ["patient"],
              isNewUser: isSignUpFlag ? true : !onboardingDone,
              onboardingCompleted: isSignUpFlag ? false : onboardingDone,
            } as any;
          }
        } catch (dbErr) {
          console.warn("[Auth authorize] DB query fallback:", dbErr);
        }

        // Fallback for mock/offline or quick demo account
        const onboardingDone = supabaseProfile?.onboarding?.completed ?? false;
        return {
          id: `demo-${Date.now()}`,
          name: supabaseProfile?.name || (email.split("@")[0].toUpperCase()),
          email,
          roles: ["patient"],
          isNewUser: isSignUpFlag ? true : !onboardingDone,
          onboardingCompleted: isSignUpFlag ? false : onboardingDone,
        } as any;
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60,
  },

  jwt: {
    maxAge: 4 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // 0. Handle client session update trigger
      if (trigger === "update" && session) {
        if (typeof session.onboardingCompleted === "boolean") {
          (token as any).onboardingCompleted = session.onboardingCompleted;
        }
        if (typeof session.isNewUser === "boolean") {
          (token as any).isNewUser = session.isNewUser;
        }
        if (session.name) {
          (token as any).name = session.name;
        }
        return token;
      }

      // 1. Google OAuth callback
      if (user && account?.provider === "google") {
        let isNewUser = false;
        let onboardingCompleted = false;
        const cleanEmail = (user as any).email?.toLowerCase().trim();

        try {
          const users = await getCollection<any>("users");
          let dbUser = await users.findOne({
            $or: [
              { identityProvider: "google", identityId: account.providerAccountId },
              ...(cleanEmail ? [{ email: cleanEmail }] : []),
            ],
          });

          isNewUser = !dbUser;

          if (!dbUser) {
            const result = await users.insertOne({
              email: cleanEmail,
              name: (user as any).name,
              identityProvider: "google",
              identityId: account.providerAccountId,
              roles: ["patient"],
              status: "active",
              onboardingCompleted: false,
              createdAt: new Date(),
              lastLoginAt: new Date(),
            });

            dbUser = { _id: result.insertedId } as any;

            // Initialize Supabase profile JSON for new Google user
            if (cleanEmail) {
              try {
                await saveProfileJsonToSupabase(cleanEmail, {
                  email: cleanEmail,
                  name: (user as any).name || "Patient",
                  basicDetails: {
                    name: (user as any).name || "Patient",
                    profileImageUrl: (user as any).image || null,
                    location: { country: "India" },
                  },
                  healthAndLifestyle: {
                    diet: { breakfast: [], lunch: [], dinner: [] },
                  },
                  customization: { theme: "light" },
                  onboarding: { completed: false },
                  updatedAt: new Date().toISOString(),
                });
              } catch (sbErr) {
                console.warn("[Auth Google] Supabase profile init failed:", sbErr);
              }

              try {
                await sendWelcomeEmail(cleanEmail, (user as any).name);
              } catch (error) {
                console.error("Failed to send welcome email:", error);
              }
            }
          } else {
            await users.updateOne(
              { _id: dbUser._id },
              {
                $set: {
                  lastLoginAt: new Date(),
                  identityProvider: "google",
                  identityId: account.providerAccountId,
                },
              }
            );
            const supabaseProfile = cleanEmail ? await getProfileJsonFromSupabase(cleanEmail) : null;
            onboardingCompleted = Boolean(
              supabaseProfile?.onboarding?.completed ??
              dbUser.onboardingCompleted ??
              dbUser.profile?.onboardingCompleted
            );
          }

          (token as any).id = (dbUser as any)._id.toString();
        } catch {
          (token as any).id = `google-${Date.now()}`;
        }

        (token as any).isNewUser = isNewUser;
        (token as any).onboardingCompleted = onboardingCompleted;
      }

      // 2. Credentials Callback
      if (user && account?.provider === "credentials") {
        (token as any).id = (user as any).id;
        (token as any).isNewUser = (user as any).isNewUser;
        (token as any).onboardingCompleted = (user as any).onboardingCompleted;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if ((token as any).id) {
          (session.user as any).id = (token as any).id as string;
        }
        (session.user as any).isNewUser = Boolean((token as any).isNewUser);
        (session.user as any).onboardingCompleted = Boolean((token as any).onboardingCompleted);
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
