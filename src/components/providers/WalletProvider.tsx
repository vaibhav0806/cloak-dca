'use client';

import { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAppStore } from '@/store';
import { resetPrivacyClient } from '@/lib/privacy';
import { analytics } from '@/lib/analytics';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

function WalletConnectionHandler({ children }: { children: React.ReactNode }) {
  const { publicKey, connected } = useWallet();
  const setWallet = useAppStore((state) => state.setWallet);
  const prevConnected = useRef(false);

  useEffect(() => {
    if (connected && publicKey) {
      setWallet(publicKey.toBase58());
      if (!prevConnected.current) {
        analytics.walletConnected();
      }
      prevConnected.current = true;
    } else if (prevConnected.current) {
      // Only reset when disconnecting from a previously connected state
      setWallet(null);
      resetPrivacyClient();
      analytics.walletDisconnected();
      prevConnected.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  return <>{children}</>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Helius primary, Quicknode fallback
  const endpoint = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_HELIUS_RPC_URL ||
      process.env.NEXT_PUBLIC_QUICKNODE_RPC_URL ||
      clusterApiUrl('devnet')
    );
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  const onError = useCallback((error: Error) => {
    console.error('Wallet error:', error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} onError={onError} autoConnect>
        <WalletModalProvider>
          <WalletConnectionHandler>{children}</WalletConnectionHandler>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
