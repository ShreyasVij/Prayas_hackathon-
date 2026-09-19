"use client";

import { 
  User, 
  LogOut, 
  LayoutDashboard, 
  ClipboardList, 
  Calendar, 
  Stethoscope, 
  Menu, 
  X, 
  ShieldCheck,
  KeyRound
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppNavbarProps {
  userName?: string;
  userRole?: "patient" | "doctor" | "admin";
}

const doctorNavItems = [
  { label: "Workspace & Diagnostics", href: "/doctor", icon: LayoutDashboard },
  { label: "Connect Patient", href: "/doctor/connect-patient", icon: KeyRound },
  { label: "Provider Profile", href: "/doctor/profile", icon: Stethoscope },
];

export function AppNavbar({ userName = "Healthcare Provider", userRole = "doctor" }: AppNavbarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated";
  const effectiveUserName = isAuthed ? (session?.user?.name || session?.user?.email || userName) : userName;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function fetchAvatar() {
      try {
        const res = await fetch("/api/doctor/profile", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        const url = data?.profile?.profileImageUrl || data?.profile?.profileImagePreviewUrl || null;
        if (!ignore && url) setAvatarUrl(url);
      } catch {}
    }
    if (isAuthed) fetchAvatar();
    return () => { ignore = true; };
  }, [isAuthed]);

  useEffect(() => {
    function onProfileUpdated() {
      (async () => {
        try {
          const res = await fetch("/api/doctor/profile", { method: "GET" });
          if (!res.ok) return;
          const data = await res.json();
          const url = data?.profile?.profileImageUrl || data?.profile?.profileImagePreviewUrl || null;
          if (url) setAvatarUrl(url);
        } catch {}
      })();
    }
    window.addEventListener("profile:updated", onProfileUpdated);
    return () => window.removeEventListener("profile:updated", onProfileUpdated);
  }, []);

  return (
    <>
      <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 transition-all">
        {/* Left section logo */}
        <div className="flex items-center gap-8">
          <Link href="/doctor" className="flex items-center gap-2.5 group no-underline text-inherit flex-shrink-0">
            <div className="p-1.5 rounded-xl bg-teal-50 border border-teal-200/80 group-hover:border-teal-400 transition-colors">
              <Image 
                src="/logo.jpg" 
                alt="MediLocker Logo" 
                width={32} 
                height={32} 
                className="rounded-lg object-contain" 
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-zinc-900 tracking-tight">
                Medi<span className="text-teal-600">Locker</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                <Stethoscope className="h-3 w-3" />
                <span>Doctor Portal</span>
              </span>
            </div>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            {doctorNavItems.map((item) => {
              const isActive = item.href === "/doctor"
                ? pathname === "/doctor"
                : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all no-underline whitespace-nowrap",
                    isActive 
                      ? "bg-teal-50 text-teal-700 border border-teal-200/80 font-semibold shadow-xs" 
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-slate-100/70"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-teal-600" : "text-zinc-400")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5 text-zinc-700" />
          ) : (
            <Menu className="h-5 w-5 text-zinc-700" />
          )}
        </button>

        {/* Right Section */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-full border border-slate-200 hover:border-teal-300 hover:bg-slate-50 transition-all shadow-xs"
                >
                  <div className="text-left hidden sm:flex flex-col justify-center">
                    <span className="text-xs font-bold text-zinc-900 leading-tight">
                      {effectiveUserName}
                    </span>
                    <span className="text-[10px] text-teal-600 font-medium flex items-center gap-1">
                      <ShieldCheck className="h-2.5 w-2.5" />
                      Verified Provider
                    </span>
                  </div>

                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      width={32}
                      height={32}
                      unoptimized
                      className="h-8 w-8 rounded-full object-cover border border-teal-300 flex-shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-teal-100 border border-teal-300 text-teal-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {effectiveUserName?.charAt(0).toUpperCase() || "D"}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-56 mt-2 p-1.5 rounded-2xl shadow-lg border border-slate-200">
                <DropdownMenuLabel className="font-normal px-3 py-2">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-xs font-bold text-zinc-900 leading-none">{effectiveUserName}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{session?.user?.email || "Healthcare Provider"}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <DropdownMenuItem asChild className="rounded-xl py-2 cursor-pointer text-xs font-medium text-zinc-700 hover:text-teal-700 hover:bg-teal-50">
                  <Link href="/doctor/profile" className="flex items-center w-full">
                    <User className="mr-2.5 h-3.5 w-3.5 text-teal-600" /> Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <DropdownMenuItem
                  className="text-rose-600 hover:bg-rose-50 rounded-xl py-2 cursor-pointer text-xs font-medium"
                  onSelect={(event) => {
                    event.preventDefault();
                    signOut({ callbackUrl: "/auth" });
                  }}
                >
                  <LogOut className="mr-2.5 h-3.5 w-3.5 text-rose-500" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link 
              href="/doctor/login" 
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all"
            >
              Sign In as Doctor
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-black/40 z-30" onClick={() => setMobileMenuOpen(false)}>
          <nav
            className="bg-white border-b border-slate-200 shadow-xl p-4 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            {doctorNavItems.map((item) => {
              const isActive = item.href === "/doctor"
                ? pathname === "/doctor"
                : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-teal-50 text-teal-700 font-semibold"
                      : "text-zinc-600 hover:bg-slate-50"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-teal-600" : "text-zinc-400")} />
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-2 border-t border-slate-100">
              {isAuthed ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: "/auth" });
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/doctor/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white"
                >
                  Sign In as Doctor
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}