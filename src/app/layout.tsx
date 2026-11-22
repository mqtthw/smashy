import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Source_Sans_3 } from "next/font/google";
import AppNav from "@/components/AppNav";
import SideAccounts from "@/components/accounts/SideAccounts";
import { PageCounter } from "@/components/ui/BackLink";
import { Suspense } from "react";
import SideColumn from "@/components/SideColumn";
import Toaster from "@/components/ui/Toaster";
import InstallPrompt from "@/components/InstallPrompt";
import RateAppPrompt from "@/components/RateAppPrompt";
import NativeAppBridge from "@/components/NativeAppBridge";
import ScrollIndicator from "@/components/ScrollIndicator";
import ServiceWorker from "@/components/push/ServiceWorker";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { siteUrl } from "@/lib/siteMeta";
import { T } from "@/lib/i18n/client";
import "./globals.css";

// Text and headings (round 487): a humanist sans in the spirit of Frutiger, for the glossy Y2K look.
const bodyFont = Source_Sans_3({
  variable: "--font-body-face",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: { default: "Smashy", template: "%s · Smashy" },
  applicationName: "Smashy",
  appleWebApp: { capable: true, title: "Smashy", statusBarStyle: "default" },
  description: "Everything Smash: locals and brackets, clips, results, and guides to get new players started.",
  // Link previews (iMessage, Discord, X…) need full addresses for their images.
  metadataBase: siteUrl(),
  // No title or description here on purpose: a link preview then uses each page's own (a ruleset's
  // name, a character page's title). Set here, they replaced those on every page without its own.
  openGraph: { siteName: "Smashy", type: "website" },
  twitter: { card: "summary_large_image" },
  // Proves to Google Search Console that this site is ours (public by design, not a secret).
  verification: { google: "auy3mk9y4XDgBXNbABT4qZDl-Zqae24VI6vWBD4z6zQ" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // installed app: draw under the phone's notch/home bar (the nav pads for it)
  // Browser/phone bar color follows the theme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbe7e3" },
    { media: "(prefers-color-scheme: dark)", color: "#140405" },
  ],
};

// Applies a saved Light/Dark choice before the page paints, so it never flashes the wrong theme.
const themeScript = `try{var t=localStorage.getItem("smashy-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);if(localStorage.getItem("smashy-hide-mains")==="1")document.documentElement.setAttribute("data-hide-mains","");if(localStorage.getItem("smashy-spoiler-mode")==="1")document.documentElement.setAttribute("data-spoiler-mode","")}catch(e){}
try{var m=document.cookie.match(/(?:^|; )lang=(en|es|ja|fr)(?:;|$)/),l=m?m[1]:"en";if(!m){var ls=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||"en"];for(var i=0;i<ls.length;i++){var c=String(ls[i]).slice(0,2).toLowerCase();if(c==="en"||c==="es"||c==="ja"||c==="fr"){l=c;break}}document.cookie="lang="+l+"; path=/; max-age=31536000; samesite=lax"}document.documentElement.lang=l}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Profile pictures, post photos and videos come from Supabase's address: connect to it while the
            page is still arriving, not when the first picture shows up (round 567, about 0.1-0.3 s on
            phones). Two connections: pictures load without credentials, the live updates with them. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
          </>
        )}
      </head>
      <body className="min-h-full md:flex md:justify-center">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:font-bold focus:text-background"
        >
          <T k="nav.skip" />
        </a>
        <AppNav accounts={<Suspense fallback={null}><SideAccounts /></Suspense>} />
        <Suspense fallback={null}>
          <PageCounter />
        </Suspense>
        {/* The bottom padding leaves room for the floating tab bar on phones */}
        <main id="main" tabIndex={-1} className="min-h-screen outline-none w-full min-w-0 max-w-2xl pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:border-r md:border-line md:pb-0">
          {children}
        </main>
        {/* Wide screens: Live now, coming up and majors on the right (round 500). */}
        <SideColumn />
        <Toaster />
        {/* It reads the page address (usePathname), which can't be prerendered outside Suspense. */}
        <Suspense fallback={null}>
          <InstallPrompt />
        </Suspense>
        <Suspense fallback={null}>
          <RateAppPrompt />
        </Suspense>
        <NativeAppBridge />
        <ScrollIndicator />
        <ServiceWorker />
        <KeyboardShortcuts />
        {/* Visit counts (Vercel Web Analytics, round 520): no cookies, no ads; see /privacy. */}
        <Analytics />
        {/* Real visitors' page speed (Vercel Speed Insights, round 523). */}
        <SpeedInsights />
      </body>
    </html>
  );
}
