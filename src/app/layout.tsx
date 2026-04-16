import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Allifate – Win on TikTok Shop", template: "%s | Allifate" },
  description:
    "Discover trending TikTok Shop products before everyone else. AI-powered analytics for affiliate marketers.",
  keywords: ["TikTok Shop", "affiliate marketing", "product research", "trending products"],
  openGraph: {
    title: "Allifate – Win on TikTok Shop",
    description: "Discover trending TikTok Shop products before everyone else.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
