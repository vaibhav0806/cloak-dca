import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
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
      className={`${manrope.variable} ${jetbrainsMono.variable}`}
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
