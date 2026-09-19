import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import './globals.css';

import Providers from "./api/auth/[...nextauth]/providers";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/server/authOptions";

export const metadata = {
  title: 'MEDILOCKER',
  description: 'Web app',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const userName = (session as any)?.user?.name || (session as any)?.user?.email || undefined;
  const role = (((session as any)?.user?.roles || [])[0] || 'patient') as 'patient' | 'doctor' | 'admin';
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Load Google Maps API */}
        {apiKey && (
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
            async
            defer
          />
        )}
      </head>
      <body className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Providers>
          <ThemeProvider>
            <AppLayout userName={userName} role={role}>
              {children}
            </AppLayout>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
