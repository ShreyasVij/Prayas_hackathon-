"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Stethoscope, User, Sparkles, UserPlus, LogIn, Lock, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { OnboardingProgressBar } from "@/components/onboarding/OnboardingProgressBar";

function AuthContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Guard to guarantee redirect executes exactly once and stops render loops
  const redirectedRef = useRef(false);

  // Mode: "signup" for new users (Create an account), "login" for old users (Login)
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"signup" | "login">(initialMode);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabaseAccountCheck, setSupabaseAccountCheck] = useState<{
    exists?: boolean;
    onboardingCompleted?: boolean;
    name?: string;
  } | null>(null);

  const [signingInAsDoctor, setSigningInAsDoctor] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // Redirect logic based on auth and onboarding status
  useEffect(() => {
    if (redirectedRef.current) return;

    if (status === "authenticated" && session?.user) {
      const user = session.user as any;
      const isNewUser = user.isNewUser === true;
      const onboardingCompleted = user.onboardingCompleted === true;
      const userRoles = (user?.roles || []) as string[];
      const isDoctorRole = userRoles.includes("doctor") || callbackUrl.startsWith("/doctor");

      redirectedRef.current = true;

      if (isDoctorRole) {
        // Doctor: direct to doctor practice vault or requested doctor route
        router.replace(callbackUrl || "/doctor");
      } else if (isNewUser || !onboardingCompleted) {
        // Patient needing initial onboarding: proceed to Step 2
        router.replace("/onboarding?step=2");
      } else {
        // Existing patient: redirect straight to dashboard
        router.replace(callbackUrl);
      }
    }
  }, [status, session, router, callbackUrl]);

  // Check Supabase when user enters email
  const handleEmailBlur = async () => {
    if (!email || !email.includes("@")) return;
    try {
      const res = await fetch("/api/auth/check-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSupabaseAccountCheck(data);
      }
    } catch {
      // ignore
    }
  };

  // Handle Create Account (New User)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Call registration API to create account and initial Supabase JSON
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // 2. Sign in with the newly created credentials
      const signInRes = await signIn("credentials", {
        email: email.trim(),
        password,
        isNewUser: "true",
        redirect: false,
      });

      if (signInRes?.error) {
        setError(signInRes.error);
        setLoading(false);
      } else {
        // Successfully created account: forward to Step 2
        router.push("/onboarding?step=2");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  // Handle Login (Old User)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const signInRes = await signIn("credentials", {
        email: email.trim(),
        password,
        isNewUser: "false",
        redirect: false,
      });

      if (signInRes?.error) {
        setError(signInRes.error || "Invalid credentials.");
        setLoading(false);
      } else {
        // Check if onboarding completed
        if (supabaseAccountCheck?.exists && !supabaseAccountCheck.onboardingCompleted) {
          router.push("/onboarding?step=2");
        } else {
          router.push(callbackUrl);
        }
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during login.");
      setLoading(false);
    }
  };

  const handleDoctorSignIn = async () => {
    try {
      setSigningInAsDoctor(true);
      await signIn("google", {
        callbackUrl: "/doctor",
      });
    } catch (error) {
      console.error("Doctor sign in error:", error);
      setSigningInAsDoctor(false);
    }
  };

  // Demo shortcut for evaluations
  const handleDemoSignIn = async (isNew: boolean) => {
    setLoading(true);
    const demoEmail = isNew
      ? `newpatient_${Date.now()}@medilocker.vault`
      : "alex.johnson@example.com";

    const res = await signIn("credentials", {
      email: demoEmail,
      password: "password123",
      isNewUser: isNew ? "true" : "false",
      redirect: false,
    });

    if (res?.ok) {
      if (isNew) {
        router.push("/onboarding?step=2");
      } else {
        router.push("/dashboard");
      }
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-6 flex flex-col items-center gap-2">
        <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800 shadow-sm">
          <Image
            src="/logo.jpg"
            alt="MediLocker Logo"
            width={44}
            height={44}
            className="rounded-xl object-contain"
          />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            MediLocker
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clinical Trust &bull; Secure Health Records
          </p>
        </div>
      </div>

      {/* Progress Line Indicator: ONLY shown for New Users / Account Creation (Step 1 out of 4) */}
      {mode === "signup" ? (
        <OnboardingProgressBar
          currentStep={1}
          title="Create an Account"
          subtitle="Step 1 out of 4: Initialize your secure clinical vault and begin setup."
        />
      ) : (
        <div className="text-center mb-8 max-w-md mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Patient Login
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5">
            Existing users: sign in to securely access your vault and health records.
          </p>
        </div>
      )}

      {/* Auth Card with CardSpotlight */}
      <CardSpotlight
        className="w-full max-w-md p-6 sm:p-8 bg-card border border-border rounded-3xl shadow-xl shadow-teal-900/5 transition-colors duration-300"
        spotlightColor="rgba(13, 148, 136, 0.10)"
      >
        {/* Two Options: Create an account vs Login toggle */}
        <div className="flex rounded-xl bg-muted p-1 mb-6 border border-border/60">
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "signup"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5 text-primary" />
            Create an Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "login"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LogIn className="h-3.5 w-3.5 text-primary" />
            Login (Existing)
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Supabase Account Status Hint for Signup */}
        {supabaseAccountCheck?.exists && mode === "signup" && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
            <span>Account exists in Supabase for this email.</span>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="font-bold underline ml-2 shrink-0"
            >
              Switch to Login
            </button>
          </div>
        )}

        {/* Supabase Account Status Hint for Login */}
        {supabaseAccountCheck?.exists === false && mode === "login" && email.includes("@") && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between">
            <span>No account found in Supabase.</span>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className="font-bold underline ml-2 shrink-0"
            >
              Create Account
            </button>
          </div>
        )}

        {supabaseAccountCheck?.exists === true && mode === "login" && (
          <div className="mb-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
            <span>Supabase account verified {supabaseAccountCheck.name ? `(${supabaseAccountCheck.name})` : ""}</span>
          </div>
        )}

        {/* OAuth Buttons (Google) */}
        <div className="space-y-3 mb-5">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/auth?callbackUrl=" + encodeURIComponent(callbackUrl) })}
            disabled={status === "loading" || loading}
            className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md hover:shadow-teal-600/20 flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer"
          >
            <User className="h-4 w-4" />
            <span>
              {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
            </span>
          </button>

          {mode === "login" && (
            <button
              type="button"
              onClick={handleDoctorSignIn}
              disabled={status === "loading" || signingInAsDoctor || loading}
              className="w-full py-2.5 px-4 rounded-xl bg-card hover:bg-muted text-foreground font-semibold text-xs border border-border shadow-xs flex items-center justify-center gap-2.5 transition-all duration-200"
            >
              <Stethoscope className="h-4 w-4 text-primary" />
              <span>
                {signingInAsDoctor ? "Authorizing Provider..." : "Continue as Healthcare Provider"}
              </span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-card px-2 text-muted-foreground font-medium">
              Or with email
            </span>
          </div>
        </div>

        {/* Form: Create Account vs Login */}
        <form onSubmit={mode === "signup" ? handleSignUp : handleLogin} className="space-y-3.5">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            {loading ? (
              <span>Processing...</span>
            ) : mode === "signup" ? (
              <>
                <span>Create Account &amp; Proceed to Profile</span>
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Sign In to Vault</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Mode Quick Access */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase text-center mb-2 tracking-wider">
            Evaluation Demo Options
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoSignIn(true)}
              className="py-2 px-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-medium text-[11px] border border-teal-200/70 dark:border-teal-800 flex items-center justify-center gap-1.5 hover:bg-teal-100 transition-all"
            >
              <Sparkles className="h-3 w-3 text-teal-600" />
              <span>New User Demo</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoSignIn(false)}
              className="py-2 px-2.5 rounded-lg bg-muted text-foreground font-medium text-[11px] border border-border flex items-center justify-center gap-1.5 hover:bg-muted/80 transition-all"
            >
              <span>Existing User Demo</span>
            </button>
          </div>
        </div>

        {/* Trust Footer */}
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
          <span>AES-256 Encrypted &bull; Supabase Backed</span>
        </div>
      </CardSpotlight>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-sm text-muted-foreground">Loading MediLocker Vault...</div>}>
      <AuthContent />
    </Suspense>
  );
}
