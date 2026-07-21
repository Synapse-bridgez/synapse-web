import type { Metadata, Viewport } from "next";
import { AMBER, BG0 } from "@/lib/constants";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const title = "Synapse Core · Testnet";
const description = "Soroban transaction lifecycle dashboard";

export const viewport: Viewport = {
  themeColor: BG0,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Synapse Core",
    title,
    description,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Synapse Core — Soroban transaction lifecycle dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/twitter-image.png"],
  },
  other: {
    "msapplication-TileColor": AMBER,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="scanline-overlay">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
