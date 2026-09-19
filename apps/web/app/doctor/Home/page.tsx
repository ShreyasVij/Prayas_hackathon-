import React from "react";
import { createClient } from "@/utils/supabase/server";
import Hero from "@/app/home/HeroSection";
import Awards from "@/app/home/Awards";
import Stats from "@/app/home/Stats";
import Pricing from "@/app/home/Pricing";
import Education from "@/app/home/Education";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthed = !!user;

  return (
    <>
      <Hero isAuthed={isAuthed} />
      <Awards />
      <Stats />
      <Pricing />
      <Education />
    </>
  );
}