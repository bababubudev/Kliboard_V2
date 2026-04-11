import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kliboard",
  description: "Temporary text clipboard. Create, share, and auto-expire.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
