import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { Geist_Mono, Sora } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const geistSans = Sora({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spotify Cleanup Tool",
  description:
    "Bulk-remove songs by selected artists from Liked Songs and owned playlists, with a safety archive playlist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <Providers>{children}</Providers>
        <Toaster richColors closeButton />
        <Analytics />
      </body>
    </html>
  );
}
