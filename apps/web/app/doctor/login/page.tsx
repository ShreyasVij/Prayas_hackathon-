"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useEffect, Suspense, useState, useRef } from "react";
import { Stethoscope, Loader2 } from "lucide-react";

function DoctorAuthBridgeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [authorizing, setAuthorizing] = useState(false);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);
  const redirectedRef = useRef(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/doctor";

  useEffect(() => {
    if (redirectedRef.current) return;

    async function handleDoctorAuth() {
      if (redirectedRef.current) return;

      const { data: { user } } = await supabase.auth.getUser();

      // If unauthenticated, redirect immediately to the unified login page
      if (!user) {
        redirectedRef.current = true;
        setIsUnauthenticated(true);
        router.replace(`/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      // If authenticated, register as doctor role and redirect to doctor vault
      redirectedRef.current = true;
      setAuthorizing(true);
        try {
          const registerRes = await fetch("/api/doctor/register", {
            method: "POST",
          });

          if (!registerRes.ok) {
            console.warn("Doctor auto-registration returned status:", registerRes.status);
          }

          const { data: profile } = await supabase.from('profiles').select('data').eq('id', user.id).single();

          if (profile?.data?.isNewUser) {
            router.replace("/doctor/profile");
          } else {
            router.replace(callbackUrl || "/doctor");
          }
        } catch (error) {
          console.error("Doctor authorization bridge error:", error);
          router.replace("/doctor");
        }
    }

    handleDoctorAuth();
  }, [router, callbackUrl, supabase]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center justify-center gap-4 text-center max-w-sm">
        <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200/80 dark:border-teal-800 text-teal-600 dark:text-teal-400 shadow-sm animate-pulse">
          <Stethoscope className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {isUnauthenticated
              ? "Redirecting to Secure Login..."
              : "Authorizing Clinical Vault..."}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isUnauthenticated
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