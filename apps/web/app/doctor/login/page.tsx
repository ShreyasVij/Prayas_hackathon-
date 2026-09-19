
"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Stethoscope, ShieldCheck, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";

function DoctorAuthContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authorizing, setAuthorizing] = useState(false);
  
  const callbackUrl = searchParams.get("callbackUrl") || "/doctor";

  useEffect(() => {
    async function handleDoctorAuth() {
      if (status === "authenticated" && session?.user) {
        setAuthorizing(true);
        try {
          // Register user as doctor (grants doctor role)
          const registerRes = await fetch("/api/doctor/register", { 
            method: "POST" 
          });
          
          if (!registerRes.ok) {
            console.error("Failed to register as doctor");
          }

          // In dry run or new user, navigate to profile or dashboard
          if (session.user.isNewUser) {
            router.push("/doctor/profile");
          } else {
            router.push("/doctor");
          }
        } catch (error) {
          console.error("Doctor registration error:", error);
          router.push("/doctor");
        }
      }
    }

    handleDoctorAuth();
  }, [status, session, router, callbackUrl]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      {/* Brand Header */}
      <div className="text-center mb-8 flex flex-col items-center gap-3">
        <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200/80 shadow-sm">
          <Image
            src="/logo.jpg"
            alt="MediLocker Logo"
            width={48}
            height={48}
            className="rounded-xl object-contain"
          />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Medi<span className="text-teal-600">Locker</span> Clinical
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Healthcare Provider Portal &bull; Verified Doctor Access
          </p>
        </div>
      </div>

      {/* CardSpotlight Container */}
      <CardSpotlight
        className="w-full max-w-md p-7 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-xl shadow-teal-900/5"
        spotlightColor="rgba(13, 148, 136, 0.12)"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold mb-3">
            <Stethoscope className="h-3.5 w-3.5" />
            <span>Physician & Provider Login</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900">
            {authorizing ? "Authorizing Clinical Vault..." : "Sign in to Provider Vault"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {authorizing 
              ? "Verifying provider credentials and syncing appointments"
              : "Access patient records, schedules, and clinical notes"}
          </p>
        </div>

        <div className="space-y-3.5">
          {authorizing ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-teal-600">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-xs font-medium text-zinc-600">
                Granting secure clinical access...
              </p>
            </div>
          ) : (
            <>
              {/* Google Doctor Sign In */}
              <button
                onClick={() => signIn("google", { callbackUrl: "/doctor/login" })}
                disabled={status === "loading"}
                className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md hover:shadow-teal-600/20 flex items-center justify-center gap-3 transition-all duration-200"
              >
                <Stethoscope className="h-4 w-4" />
                <span>
                  {status === "loading" ? "Connecting to Provider Network..." : "Continue with Google as Doctor"}
                </span>
              </button>

              {/* Demo Mode Direct Link */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-zinc-400 font-medium">Evaluation Mode</span>
                </div>
              </div>

              <Link
                href="/doctor"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-teal-700 font-medium text-xs border border-teal-200/60 flex items-center justify-center gap-2 transition-all text-center"
              >
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>Instant Clinical Demo (Skip Login)</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </>
          )}

          {/* Switch to Patient Login */}
          <div className="pt-3 text-center">
            <Link
              href="/auth"
              className="text-xs text-zinc-500 hover:text-teal-700 transition-colors"
            >
              Are you a patient? Continue to patient portal &rarr;
            </Link>
          </div>
        </div>

        {/* Clinical Trust Security Tag */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
          <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
          <span>HIPAA-Compliant Cryptographic Access &bull; Provider Attributed</span>
        </div>
      </CardSpotlight>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-sm text-zinc-500">Loading Clinical Vault...</div>}>
      <DoctorAuthContent />
    </Suspense>
  );
}