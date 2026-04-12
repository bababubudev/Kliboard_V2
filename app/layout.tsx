import type { Metadata } from "next";
import "./globals.css";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

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
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kliboard.vercel.app"
  ),
  title: {
    default: "Kliboard",
    template: "%s | Kliboard",
  },
  description:
    "Temporary text clipboard. Create named spaces, paste text, share via space name. Auto-deletes after your chosen duration — no signup required.",
  keywords: [
    "clipboard",
    "temporary",
    "text sharing",
    "paste",
    "ephemeral",
    "auto-delete",
    "kliboard",
  ],
  openGraph: {
    title: "Kliboard",
    description:
      "Temporary text clipboard. Create, share, and auto-expire — no signup required.",
    siteName: "Kliboard",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Kliboard",
    description:
      "Temporary text clipboard. Create, share, and auto-expire — no signup required.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark", inter.variable, spaceGrotesk.variable, jetbrainsMono.variable)}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
