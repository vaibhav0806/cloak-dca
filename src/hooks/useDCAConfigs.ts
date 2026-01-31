'use client';

import { useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAppStore } from '@/store';
import { privacyClient } from '@/lib/privacy';
import type { CreateDCAParams, DCAConfig } from '@/types';

export function useDCAConfigs() {
  const { publicKey, connected } = useWallet();
  // Use selectors to only subscribe to what we need
  const dcaConfigs = useAppStore((state) => state.dcaConfigs);
  const isLoadingConfigs = useAppStore((state) => state.isLoadingConfigs);
  const hasFetchedConfigs = useAppStore((state) => state.hasFetchedConfigs);
  const executions = useAppStore((state) => state.executions);
  const walletAddress = useAppStore((state) => state.walletAddress);
  const fetchDCAConfigs = useAppStore((state) => state.fetchDCAConfigs);
  const storeCreateDCA = useAppStore((state) => state.createDCA);
  const pauseDCA = useAppStore((state) => state.pauseDCA);
  const resumeDCA = useAppStore((state) => state.resumeDCA);
  const cancelDCA = useAppStore((state) => state.cancelDCA);
  const setExecutions = useAppStore((state) => state.setExecutions);

  // Fetch DCA configs when wallet connects (store handles deduplication)
  useEffect(() => {
    if (connected && publicKey && walletAddress) {
      fetchDCAConfigs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, walletAddress]);

  const fetchExecutions = useCallback(
    async (dcaId: string) => {
      if (!walletAddress) return;

      try {
        const response = await fetch(`/api/dca/${dcaId}/executions`, {
          headers: {
            'x-wallet-address': walletAddress,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setExecutions(dcaId, data.executions || []);
        }
      } catch (error) {
        console.error('Error fetching executions:', error);
      }
    },
    [walletAddress, setExecutions]
  );

  const handleCreateDCA = useCallback(
    async (params: CreateDCAParams): Promise<DCAConfig | null> => {
      if (!connected || !publicKey) {
        throw new Error('Wallet not connected');
      }

      // Get the session keypair from the privacy client
      // This will prompt the user to sign a message if not already signed
      let sessionKeypairBase64: string;

      try {
        sessionKeypairBase64 = await privacyClient.exportSessionKeypair();
      } catch (error) {
        console.error('Error getting session keypair:', error);
        throw new Error('Please sign the message to create a session for DCA operations');
      }

      return storeCreateDCA({
        ...params,
        sessionKeypairBase64,
      });
    },
    [connected, publicKey, storeCreateDCA]
  );

  const getActiveConfigs = useCallback(() => {
    // Include 'executing' status since it's still an active DCA, just currently running a trade
    return dcaConfigs.filter((c) => c.status === 'active' || c.status === 'executing');
  }, [dcaConfigs]);

  const getPausedConfigs = useCallback(() => {
    return dcaConfigs.filter((c) => c.status === 'paused');
  }, [dcaConfigs]);

  const getCompletedConfigs = useCallback(() => {
    return dcaConfigs.filter((c) => c.status === 'completed');
  }, [dcaConfigs]);

  return {
    configs: dcaConfigs,
    isLoading: isLoadingConfigs,
    executions,
    fetchConfigs: fetchDCAConfigs,
    fetchExecutions,
    createDCA: handleCreateDCA,
    pauseDCA,
    resumeDCA,
    cancelDCA,
    getActiveConfigs,
    getPausedConfigs,
    getCompletedConfigs,
  };
}
