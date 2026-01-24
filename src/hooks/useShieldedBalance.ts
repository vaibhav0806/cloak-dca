'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAppStore } from '@/store';
import { privacyClient, initializePrivacyClient, resetPrivacyClient } from '@/lib/privacy';
import { getConnection } from '@/lib/solana/connection';
import { SUPPORTED_INPUT_TOKENS, SUPPORTED_OUTPUT_TOKENS } from '@/lib/solana/constants';
import type { TokenInfo } from '@/types';

export function useShieldedBalance() {
  const { publicKey, signTransaction, signAllTransactions, signMessage, connected } = useWallet();
  // Use selectors to only subscribe to what we need
  const shieldedBalances = useAppStore((state) => state.shieldedBalances);
  const isLoadingBalances = useAppStore((state) => state.isLoadingBalances);
  const hasFetchedBalances = useAppStore((state) => state.hasFetchedBalances);
  const setShieldedBalances = useAppStore((state) => state.setShieldedBalances);
  const setLoadingBalances = useAppStore((state) => state.setLoadingBalances);

  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const isMounted = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initialize privacy client when wallet connects (only once per wallet)
  useEffect(() => {
    if (connected && publicKey && signTransaction && signAllTransactions && signMessage && !hasInitialized.current) {
      try {
        initializePrivacyClient({
          connection: getConnection(),
          wallet: {
            publicKey,
            signTransaction,
            signAllTransactions,
            signMessage,
          },
        });
        hasInitialized.current = true;
        if (isMounted.current) {
          setIsInitialized(true);
          setInitError(null);
        }
      } catch (error) {
        console.error('Failed to initialize privacy client:', error);
        if (isMounted.current) {
          setInitError('Failed to initialize privacy client');
          setIsInitialized(false);
        }
      }
    }

    // Reset when wallet disconnects
    if (!connected && hasInitialized.current) {
      hasInitialized.current = false;
      if (isMounted.current) setIsInitialized(false);
      resetPrivacyClient();
    }
  }, [connected, publicKey, signTransaction, signAllTransactions, signMessage]);

  const fetchBalances = useCallback(async (force = false) => {
    if (!connected || !publicKey || !isInitialized) return;

    // Prevent duplicate fetches unless forced
    const state = useAppStore.getState();
    if (state.isLoadingBalances || (state.hasFetchedBalances && !force)) return;

    setLoadingBalances(true);

    try {
      // Get unique tokens from both input and output
      const tokenMap = new Map<string, TokenInfo>();
      [...SUPPORTED_INPUT_TOKENS, ...SUPPORTED_OUTPUT_TOKENS].forEach((token) => {
        tokenMap.set(token.mint, token);
      });
      const tokens = Array.from(tokenMap.values());

      const balances = await privacyClient.getAllShieldedBalances(tokens);
      setShieldedBalances(balances);
    } catch (error) {
      console.error('Error fetching shielded balances:', error);
      // Set empty balances on error (this still marks as fetched)
      setShieldedBalances([]);
    } finally {
      setLoadingBalances(false);
    }
  }, [connected, publicKey, isInitialized, setShieldedBalances, setLoadingBalances]);

  // Fetch balances when wallet connects and client is initialized (store handles deduplication)
  useEffect(() => {
    if (connected && publicKey && isInitialized) {
      fetchBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, isInitialized]);

  const deposit = useCallback(
    async (tokenMint: string, amount: number) => {
      if (!connected || !isInitialized) throw new Error('Wallet not connected or client not initialized');

      const result = await privacyClient.deposit(tokenMint, amount);
      // Force refresh balances after deposit
      await fetchBalances(true);
      return result;
    },
    [connected, isInitialized, fetchBalances]
  );

  const withdraw = useCallback(
    async (tokenMint: string, amount: number, recipient: string) => {
      if (!connected || !isInitialized) throw new Error('Wallet not connected or client not initialized');

      const result = await privacyClient.withdraw(tokenMint, amount, recipient);
      // Force refresh balances after withdrawal
      await fetchBalances(true);
      return result;
    },
    [connected, isInitialized, fetchBalances]
  );

  const getSessionPublicKey = useCallback(async () => {
    if (!isInitialized) throw new Error('Client not initialized');
    return await privacyClient.getSessionPublicKey();
  }, [isInitialized]);

  return {
    balances: shieldedBalances,
    isLoading: isLoadingBalances,
    hasFetched: hasFetchedBalances,
    isInitialized,
    initError,
    fetchBalances,
    deposit,
    withdraw,
    getSessionPublicKey,
  };
}
