import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import './globals.css';

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: 'MEDILOCKER',
  description: 'Web app',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role: 'patient' | 'doctor' | 'admin' = 'patient';
  let userName = user?.email || undefined;

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role) {
      role = profile.role as any;
    }
  }
  
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
        <ThemeProvider>
          <AppLayout userName={userName} role={role}>
            {children}
          </AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
