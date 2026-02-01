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
  metadataBase: new URL("https://usecloak.xyz"),
  title: {
    default: "Cloak — Private DCA on Solana | Accumulate Wealth Quietly",
    template: "%s | Cloak",
  },
  description:
    "Privacy-preserving dollar cost averaging on Solana. Shield your trading activity and DCA into SOL, BTC, and ZEC privately. Automated, secure, and completely anonymous.",
  keywords: [
    "Solana",
    "DCA",
    "dollar cost averaging",
    "privacy",
    "crypto",
    "trading",
    "cloak",
    "private trading",
    "shielded",
    "anonymous",
    "SOL",
    "Bitcoin",
    "Zcash",
  ],
  authors: [{ name: "Cloak" }],
  creator: "Cloak",
  publisher: "Cloak",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://usecloak.xyz",
    siteName: "Cloak",
    title: "Cloak — Private DCA on Solana | Accumulate Wealth Quietly",
    description:
      "Privacy-preserving dollar cost averaging on Solana. Shield your trading activity and DCA into SOL, BTC, and ZEC privately. Automated, secure, and anonymous.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cloak - Private DCA on Solana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloak — Private DCA on Solana | Accumulate Wealth Quietly",
    description:
      "Privacy-preserving dollar cost averaging on Solana. Shield your trading activity and DCA into SOL, BTC, and ZEC privately. Automated, secure, and anonymous.",
    images: ["/og-image.png"],
    creator: "@usecloak",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
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
