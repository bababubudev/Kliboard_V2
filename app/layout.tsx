import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ServiceWorkerRegister } from "@/components/layout/service-worker-register";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kliboard.online"
  ),
  title: {
    default: "Kliboard — Temporary Text Clipboard, Auto-Expiring Notes",
    template: "%s | Kliboard",
  },
  description:
    "Create a named space, paste any text or files, and share the link instantly. Everything auto-deletes after your chosen duration — no signup, no tracking.",
  keywords: [
    "clipboard",
    "temporary",
    "text sharing",
    "paste",
    "ephemeral",
    "auto-delete",
    "kliboard",
    "kliboard-v2",
  ],
  openGraph: {
    title: "Kliboard — Temporary Text Clipboard, Auto-Expiring Notes",
    description:
      "Create a named space, paste any text or files, and share the link instantly. Everything auto-deletes after your chosen duration — no signup, no tracking.",
    siteName: "Kliboard",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kliboard — Temporary Text Clipboard, Auto-Expiring Notes",
    description:
      "Create a named space, paste any text or files, and share the link instantly. Everything auto-deletes after your chosen duration — no signup, no tracking.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Kliboard.V2",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f0ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, spaceGrotesk.variable, jetbrainsMono.variable)}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t='dark';var raw=localStorage.getItem('kliboard-theme');var pref=raw?JSON.parse(raw).state.theme:'system';if(pref==='light'){t='light';}else if(pref==='dark'){t='dark';}else{t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark');}}})();`,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @supports not (color: var(--a)) {
                html { background: #0d0f0f; color: #e3e6e6; }
                body { background: #0d0f0f; color: #e3e6e6; font-family: "Inter", system-ui, sans-serif; -webkit-text-size-adjust: 100%; }
                h1, h2, h3, h4, h5, h6 { font-family: "Space Grotesk", system-ui, sans-serif; }
                a { color: #aacfbc; }
                input, textarea, select { background: #171a1a; color: #e3e6e6; border: 1px solid #252929; border-radius: 8px; padding: 6px 12px; font-family: inherit; }
                button { cursor: pointer; background: #1d2020; color: #e3e6e6; border: 1px solid #252929; border-radius: 8px; padding: 6px 12px; font-family: inherit; }
                button svg { color: #e3e6e6; stroke: #e3e6e6; }
                nav { padding: 8px 12px; }
                main { padding: 8px 12px; }
                footer { padding: 8px 12px; color: #a8acab; font-size: 12px; }
              }
            `,
          }}
        />
      </head>
      <body className="min-h-dvh bg-background font-sans antialiased">
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
