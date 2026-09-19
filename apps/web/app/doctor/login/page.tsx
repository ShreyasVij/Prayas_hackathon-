"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState, useRef } from "react";
import { Stethoscope, Loader2 } from "lucide-react";

function DoctorAuthBridgeContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authorizing, setAuthorizing] = useState(false);
  const redirectedRef = useRef(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/doctor";

  useEffect(() => {
    if (redirectedRef.current) return;
    if (status === "loading") return;

    async function handleDoctorAuth() {
      if (redirectedRef.current) return;

      // If unauthenticated, redirect immediately to the unified login page
      if (status === "unauthenticated") {
        redirectedRef.current = true;
        router.replace(`/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      // If authenticated, register as doctor role and redirect to doctor vault
      if (status === "authenticated" && session?.user) {
        redirectedRef.current = true;
        setAuthorizing(true);
        try {
          const registerRes = await fetch("/api/doctor/register", {
            method: "POST",
          });

          if (!registerRes.ok) {
            console.warn("Doctor auto-registration returned status:", registerRes.status);
          }

          if ((session.user as any)?.isNewUser) {
            router.replace("/doctor/profile");
          } else {
            router.replace(callbackUrl || "/doctor");
          }
        } catch (error) {
          console.error("Doctor authorization bridge error:", error);
          router.replace("/doctor");
        }
      }
    }

    handleDoctorAuth();
  }, [status, session, router, callbackUrl]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center justify-center gap-4 text-center max-w-sm">
        <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200/80 dark:border-teal-800 text-teal-600 dark:text-teal-400 shadow-sm animate-pulse">
          <Stethoscope className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {status === "unauthenticated"
              ? "Redirecting to Secure Login..."
              : "Authorizing Clinical Vault..."}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {status === "unauthenticated"
              ? "Forwarding to the unified MediLocker authentication portal..."
              : "Verifying provider credentials and syncing clinical records..."}
          </p>
        </div>
        <Loader2 className="h-6 w-6 text-teal-600 animate-spin mt-2" />
      </div>
    </div>
  );
}

export default function DoctorLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-center py-20 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600 mr-2 inline" />
          Loading Clinical Vault...
        </div>
      }
    >
      <DoctorAuthBridgeContent />
    </Suspense>
  );
}