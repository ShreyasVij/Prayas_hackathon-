// Strict Tailwind tokens for the "Clinical Trust" design scheme
// Import these constants into your components to ensure consistency.
// e.g., <div className={theme.layout.bentoCard}>...</div>

export const theme = {
  colors: {
    // Backgrounds
    background: "bg-slate-50",
    surface: "bg-white",
    
    // Text
    textPrimary: "text-zinc-900",
    textSecondary: "text-zinc-600",
    textMuted: "text-zinc-500",
    
    // Brand & Accents
    brandPrimary: "text-teal-600",
    brandBg: "bg-teal-600 hover:bg-teal-700 text-white",
    brandBorder: "border-teal-600",
    brandSubtle: "bg-teal-50 text-teal-700",
    
    // Alerts (Strictly for emergencies/destructive actions)
    alertCritical: "text-rose-600",
    alertCriticalBg: "bg-rose-600 hover:bg-rose-700 text-white",
    alertCriticalSubtle: "bg-rose-50 text-rose-700",
  },

  typography: {
    // Headings
    h1: "text-4xl md:text-5xl font-bold tracking-tight text-zinc-900",
    h2: "text-3xl font-semibold tracking-tight text-zinc-900",
    h3: "text-2xl font-semibold text-zinc-900",
    
    // Body & Summaries (Highly Legible)
    body: "text-base text-zinc-900 leading-relaxed",
    summary: "text-lg md:text-xl text-zinc-900 leading-loose", // Generous line-height for AI summaries
    small: "text-sm text-zinc-500",
  },

  layout: {
    // Standard page layout
    pageContainer: "min-h-screen bg-slate-50 p-4 md:p-8 lg:p-12",
    
    // Bento Box / CSS Grid Layouts
    bentoGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
    bentoHero: "col-span-1 md:col-span-2 lg:col-span-2", // Spans wider for hero content
    
    // Card Base
    bentoCard: "bg-white rounded-2xl p-6 shadow-sm border border-slate-200 transition-all duration-200 ease-in-out hover:shadow-md",
    bentoCardInteractive: "bg-white rounded-2xl p-6 shadow-sm border border-slate-200 transition-all duration-200 ease-in-out hover:shadow-md hover:border-teal-300 cursor-pointer",
  },

  components: {
    // Button bases (if not using shadcn directly, or to override them)
    buttonPrimary: "inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2",
    buttonSecondary: "inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2",
    buttonCritical: "inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2",
    
    // Inputs
    input: "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-colors",
  }
};
