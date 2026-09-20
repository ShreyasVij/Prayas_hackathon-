import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'; // default redirect

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // If we are redirecting to onboarding and need to check profile
      // For now, we trust the `next` param or fall back to /dashboard
      
      // Let's check if the user has a profile and if onboarding is complete
      const { data: { user } } = await supabase.auth.getUser();
      if (user && next === '/dashboard') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboardingCompleted')
          .eq('id', user.id)
          .single();
          
        if (profile && !profile.onboardingCompleted) {
           return NextResponse.redirect(new URL('/onboarding?step=2', request.url));
        }
      }
      
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // If there's an error or no code, redirect back to login page
  return NextResponse.redirect(new URL('/auth?error=OAuth failed', request.url));
}
