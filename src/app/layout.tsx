import type { Metadata } from "next";
import { Syne, Space_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cloak — Private DCA",
  description:
    "Accumulate wealth quietly. Privacy-preserving dollar cost averaging on Solana.",
  keywords: ["Solana", "DCA", "privacy", "crypto", "trading", "cloak"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans min-h-screen bg-background text-foreground"
        suppressHydrationWarning
      >
        <SupabaseProvider>
          <WalletProvider>{children}</WalletProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
