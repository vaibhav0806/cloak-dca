import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cloak - Private Dollar Cost Averaging on Solana",
  description:
    "Privacy-preserving DCA on Solana. Accumulate crypto without revealing your trading strategy. Built with Privacy.cash and Jupiter.",
  keywords: ["Solana", "DCA", "privacy", "crypto", "trading", "cloak", "anonymous"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SupabaseProvider>
          <WalletProvider>{children}</WalletProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
