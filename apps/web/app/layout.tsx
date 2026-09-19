import React from 'react'
import { AppLayout } from '@/components/AppLayout'
import './globals.css'

import Providers from "./api/auth/[...nextauth]/providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/server/authOptions";
import { MOCK_USER } from "@/lib/dry-run/mock-data";

const DRY_RUN = process.env.NEXT_PUBLIC_DRY_RUN === 'true';

export const metadata = {
  title: 'MEDILOCKER',
  description: 'Web app',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // In DRY_RUN mode skip real session lookup — no OAuth credentials needed
  const session = DRY_RUN
    ? { user: MOCK_USER }
    : await getServerSession(authOptions);
  const userName = (session as any)?.user?.name || (session as any)?.user?.email || undefined;
  const role = (((session as any)?.user?.roles || [])[0] || 'patient') as 'patient' | 'doctor' | 'admin';
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  return (
    <html lang="en">
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
      <body className="min-h-screen bg-background text-foreground">
        <Providers>
          <AppLayout userName={userName} role={role}>
            {children}
          </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
