"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Stethoscope, User, Sparkles } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";

function AuthContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [signingInAsDoctor, setSigningInAsDoctor] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (session.user.isNewUser) {
        router.push("/profile");
      } else {
        router.push(callbackUrl);
      }
    }
  }, [status, session, router, callbackUrl]);

  const handleDoctorSignIn = async () => {
    try {
      setSigningInAsDoctor(true);
      await signIn("google", { 
        callbackUrl: "/doctor/login"
      });
    } catch (error) {
      console.error("Doctor sign in error:", error);
      setSigningInAsDoctor(false);
    }
  };

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
            MediLocker
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Clinical Trust &bull; Secure Health Records
          </p>
        </div>
      </div>

      {/* Auth Card with CardSpotlight */}
      <CardSpotlight
        className="w-full max-w-md p-7 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-xl shadow-teal-900/5"
        spotlightColor="rgba(13, 148, 136, 0.10)"
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-zinc-900">
            Welcome to Your Vault
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Select your access role to continue with Google
          </p>
        </div>

        <div className="space-y-3.5">
          {/* Patient Login */}
          <button
            onClick={() => signIn("google", { callbackUrl })}
            disabled={status === "loading" || signingInAsDoctor}
            className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md hover:shadow-teal-600/20 flex items-center justify-center gap-3 transition-all duration-200"
          >
            <User className="h-4 w-4" />
            <span>
              {status === "loading" ? "Connecting to Vault..." : "Continue as Patient"}
            </span>
          </button>

          {/* Doctor Login */}
          <button
            onClick={handleDoctorSignIn}
            disabled={status === "loading" || signingInAsDoctor}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-50 text-zinc-800 font-semibold text-sm border border-slate-300 shadow-sm flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Stethoscope className="h-4 w-4 text-teal-600" />
            <span>
              {signingInAsDoctor ? "Authorizing Provider..." : "Continue as Doctor"}
            </span>
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-zinc-400 font-medium">Evaluation Mode</span>
            </div>
          </div>

          {/* Demo Mode Quick Access */}
          <Link
            href="/dashboard"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-teal-700 font-medium text-xs border border-teal-200/60 flex items-center justify-center gap-2 transition-all text-center"
          >
            <Sparkles className="h-3.5 w-3.5 text-teal-600" />
            <span>Instant Demo Preview (Skip Login)</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Clinical Trust Footer */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
          <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
          <span>AES-256 Client Encryption &bull; Doctor Attributed</span>
        </div>
      </CardSpotlight>

    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-sm text-zinc-500">Loading MediLocker Vault...</div>}>
      <AuthContent />
    </Suspense>
  );
}
