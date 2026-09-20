"use client";

import {
  User,
  LogOut,
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Calendar,
  ClipboardList,
  UsersRound,
  Menu,
  X,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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

const patientNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Family", href: "/family", icon: UsersRound },
  { label: "Appointments", href: "/appointments/book", icon: Calendar },
  { label: "Emergency", href: "/emergency/settings", icon: AlertTriangle },
];

const doctorNavItems = [
  { label: "Patient Records", href: "/doctor", icon: ClipboardList },
];

export function AppNavbar({
  userName,
  userRole = "patient",
}: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isAuthed = !!userName;
  const effectiveUserName = userName || "Patient";
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/home");
  };

  useEffect(() => {
    let ignore = false;

    async function fetchAvatar() {
      try {
        const res = await fetch("/api/profile", { method: "GET" });
        if (!res.ok) return;

        const data = await res.json();
        const url = data?.profile?.profileImageUrl || null;

        if (!ignore) setAvatarUrl(url);
      } catch {}
    }

    if (isAuthed) fetchAvatar();

    return () => {
      ignore = true;
    };
  }, [isAuthed]);

  useEffect(() => {
    function onProfileUpdated() {
      (async () => {
        try {
          const res = await fetch("/api/profile", { method: "GET" });
          if (!res.ok) return;

          const data = await res.json();
          setAvatarUrl(data?.profile?.profileImageUrl || null);
        } catch {}
      })();
    }

    window.addEventListener("profile:updated", onProfileUpdated);

    return () =>
      window.removeEventListener(
        "profile:updated",
        onProfileUpdated,
      );
  }, []);

  const roleLabels = {
    patient: "Patient",
    doctor: "Healthcare Provider",
    admin: "Administrator",
  } as const;

  const authenticatedNavItems =
    userRole === "doctor"
      ? doctorNavItems
      : patientNavItems;

  return (
    <>
      <header className="h-20 border-b border-border bg-card px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 transition-colors duration-300">
        {/* Left section logo */}
        <div className="flex items-center gap-6 sm:gap-10">
          <Link
            href="/home"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity no-underline text-inherit shrink-0"
          >
            <Image
              src="/logo.jpg"
              alt="Medora Logo"
              width={40}
              height={36}
              className="rounded-md object-contain"
            />

            <span className="text-xl font-bold tracking-tight text-foreground hidden sm:block">
              Medora
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            {isAuthed ? (
              // Authenticated user navigation
              authenticatedNavItems.map((item) => {
                const isActive =
                  item.href === "/" ||
                  item.href === "/doctor"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all no-underline whitespace-nowrap",
                      isActive
                        ? "bg-primary/10 text-primary shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })
            ) : (
              // Unauthenticated user navigation: Home & Documents tabs
              // When clicked, redirect to login page (/auth)
              <>
                <Link
                  href="/auth"
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all no-underline whitespace-nowrap",
                    pathname === "/home" ||
                      pathname === "/"
                      ? "bg-primary/10 text-primary shadow-xs font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  title="Click to log in to access Home"
                >
                  <Home className="h-4 w-4 text-primary" />
                  Home
                </Link>

                <Link
                  href="/auth?callbackUrl=/documents"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all no-underline whitespace-nowrap"
                  title="Click to log in to view Documents"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Documents
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Right section (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {/* Smooth Dark/White Mode Toggle */}
          <ThemeToggle />

          {isAuthed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 pl-4 pr-2 h-11 w-auto min-w-fit rounded-full border border-border hover:bg-muted/40 transition-all shadow-xs"
                >
                  <div className="text-left hidden sm:flex flex-col justify-center">
                    <span className="text-sm font-semibold leading-tight tracking-tight text-foreground whitespace-nowrap">
                      {effectiveUserName}
                    </span>

                    <span className="text-[10px] text-muted-foreground font-medium">
                      {roleLabels[userRole]}
                    </span>
                  </div>

                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      width={32}
                      height={32}
                      unoptimized
                      className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-64 mt-2 p-2 rounded-xl bg-card border border-border shadow-lg"
              >
                <DropdownMenuLabel className="font-normal px-3 py-2.5">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-foreground">
                      {effectiveUserName}
                    </p>

                    <p className="text-xs leading-none text-muted-foreground">
                      {roleLabels[userRole]}
                    </p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="my-1.5" />

                <DropdownMenuItem
                  asChild
                  className="rounded-lg py-2.5 cursor-pointer"
                >
                  <Link
                    href="/profile"
                    className="flex items-center w-full text-foreground no-underline hover:text-foreground"
                  >
                    <User className="mr-3 h-4 w-4 text-primary" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1.5" />

                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg py-2.5 cursor-pointer"
                  onSelect={(event) => {
                    event.preventDefault();
                    handleSignOut();
                  }}
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/auth?mode=login"
              className="no-underline"
            >
              <Button className="h-10 rounded-full px-5 font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                Login / Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Menu & Theme Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />

          <button
            onClick={() =>
              setMobileMenuOpen(!mobileMenuOpen)
            }
            className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-muted text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 top-20 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        >
          <nav
            className="absolute top-0 left-0 right-0 bg-card border-b border-border shadow-lg p-4 space-y-2"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {isAuthed ? (
              <>
                {authenticatedNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className="flex items-center gap-3 px-3.5 py-3 text-sm font-medium rounded-lg text-foreground hover:bg-muted no-underline"
                  >
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.label}
                  </Link>
                ))}

                <div className="border-t border-border pt-3 mt-2">
                  <Link
                    href="/profile"
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className="flex items-center gap-3 px-3.5 py-3 text-sm font-medium rounded-lg text-foreground hover:bg-muted no-underline"
                  >
                    <User className="h-4 w-4 text-primary" />
                    Profile Settings
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="mt-2 flex w-full items-center gap-3 px-3.5 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              // Unauthenticated mobile menu: redirects to /auth
              <div className="space-y-2">
                <Link
                  href="/auth"
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className="flex items-center gap-3 px-3.5 py-3 text-sm font-medium rounded-lg text-foreground hover:bg-muted no-underline"
                >
                  <Home className="h-4 w-4 text-primary" />
                  Home (Redirects to Login)
                </Link>

                <Link
                  href="/auth?callbackUrl=/documents"
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className="flex items-center gap-3 px-3.5 py-3 text-sm font-medium rounded-lg text-foreground hover:bg-muted no-underline"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  Documents (Redirects to Login)
                </Link>

                <div className="pt-2 grid grid-cols-2 gap-2">
                  <Link
                    href="/auth?mode=login"
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className="flex items-center justify-center py-2.5 text-xs font-bold rounded-xl bg-card border border-border text-foreground hover:bg-muted shadow-xs no-underline"
                  >
                    Login (Old User)
                  </Link>

                  <Link
                    href="/auth?mode=signup"
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className="flex items-center justify-center py-2.5 text-xs font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}