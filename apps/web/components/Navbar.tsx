"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import React from "react";
import { ShieldAlert, ArrowRight, User } from "lucide-react";

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || "";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const user = session?.user;
  const initials = getInitials(user?.name ?? null, user?.email ?? null);

  const role = (user as any)?.role as string | undefined;
  const links = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/documents", label: "Documents", show: true },
    { href: "/family", label: "Family Vault", show: true },
    { href: "/doctor", label: "Clinical Portal", show: role === "doctor" || role === "admin" },
  ].filter(l => l.show);

  if (pathname?.startsWith("/emergency")) return null;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-xl bg-teal-50 border border-teal-200/80 group-hover:border-teal-400 transition-colors">
              <Image
                src="/logo.jpg"
                alt="MediLocker Logo"
                width={32}
                height={32}
                className="rounded-lg object-contain"
              />
            </div>
            <span className="font-extrabold text-lg text-zinc-900 tracking-tight">
              Medi<span className="text-teal-600">Locker</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "text-teal-700 bg-teal-50/80 font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-slate-100/70"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            <Link
              href="/emergency/nfc"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
              <span>Emergency</span>
            </Link>

            {status !== "authenticated" ? (
              <Link
                href="/auth"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all"
              >
                <span>Access Vault</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/profile"
                  className="w-9 h-9 rounded-full bg-teal-100 border border-teal-300 text-teal-800 text-xs font-bold flex items-center justify-center hover:ring-2 hover:ring-teal-500/20 transition-all"
                  title={user?.name ?? user?.email ?? "Profile"}
                >
                  {initials}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-xs text-zinc-500 hover:text-zinc-800 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
