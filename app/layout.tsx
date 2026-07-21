import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synapse Core · Testnet",
  description: "Soroban transaction lifecycle dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="scanline-overlay">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
