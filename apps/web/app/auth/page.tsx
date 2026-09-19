"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Stethoscope, User, Sparkles, UserPlus, LogIn, Lock, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { OnboardingProgressBar } from "@/components/onboarding/OnboardingProgressBar";
import { createClient } from "@/utils/supabase/client";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Mode: "signup" for new users, "login" for old users
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"signup" | "login">(initialMode);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [signingInAsDoctor, setSigningInAsDoctor] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    // Check if already authenticated on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        handleRedirect(user);
      }
    });
  }, []);

  const handleRedirect = async (user: any) => {
    // Check profile
    const { data: profile } = await supabase.from('profiles').select('role, data').eq('id', user.id).single();
    
    const isDoctor = profile?.role === 'doctor' || callbackUrl.startsWith("/doctor");
    const onboardingCompleted = profile?.data?.onboarding?.completed === true;

    if (isDoctor) {
      router.replace(callbackUrl || "/doctor");
    } else if (!onboardingCompleted) {
      router.replace("/onboarding?step=2");
    } else {
      router.replace(callbackUrl);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
          }
        }
      });

      if (signUpError) throw signUpError;
      
      if (data.user) {
        // Successful signup, redirect to onboarding
        router.push("/onboarding?step=2");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;
      
      if (data.user) {
        await handleRedirect(data.user);
      }
    } catch (err: any) {
      setError(err?.message || "Invalid credentials.");
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google') => {
    try {
      setLoading(true);
      if (callbackUrl.startsWith("/doctor")) setSigningInAsDoctor(true);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("OAuth sign in error:", err);
      setError(err?.message || "OAuth login failed");
      setLoading(false);
      setSigningInAsDoctor(false);
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

      {/* Auth Card */}
      <CardSpotlight
        className="w-full max-w-md p-6 sm:p-8 bg-card border border-border rounded-3xl shadow-xl shadow-teal-900/5 transition-colors duration-300"
        spotlightColor="rgba(13, 148, 136, 0.10)"
      >
        <div className="flex rounded-xl bg-muted p-1 mb-6 border border-border/60">
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "signup" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5 text-primary" />
            Create an Account
          </button>
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "login" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LogIn className="h-3.5 w-3.5 text-primary" />
            Login (Existing)
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* OAuth Buttons (Google) */}
        <div className="space-y-3 mb-5">
          <button
            type="button"
            onClick={() => handleOAuthSignIn("google")}
            disabled={loading}
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
              onClick={() => {
                router.push("/doctor/login");
              }}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-card hover:bg-muted text-foreground font-semibold text-xs border border-border shadow-xs flex items-center justify-center gap-2.5 transition-all duration-200"
            >
              <Stethoscope className="h-4 w-4 text-primary" />
              <span>
                Continue as Healthcare Provider
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
