import { create } from 'zustand';
import type { DCAConfig, Execution, ShieldedBalance, CreateDCAParams } from '@/types';

interface CreateDCAParamsWithSession extends CreateDCAParams {
  sessionKeypairBase64: string;
}

interface AppState {
  // Wallet
  isConnected: boolean;
  walletAddress: string | null;
  setWallet: (address: string | null) => void;

  // Shielded Balances
  shieldedBalances: ShieldedBalance[];
  isLoadingBalances: boolean;
  hasFetchedBalances: boolean;
  setShieldedBalances: (balances: ShieldedBalance[]) => void;
  setLoadingBalances: (loading: boolean) => void;

  // DCA Configs
  dcaConfigs: DCAConfig[];
  isLoadingConfigs: boolean;
  hasFetchedConfigs: boolean;
  setDCAConfigs: (configs: DCAConfig[]) => void;
  addDCAConfig: (config: DCAConfig) => void;
  updateDCAConfig: (id: string, updates: Partial<DCAConfig>) => void;
  setLoadingConfigs: (loading: boolean) => void;

  // Executions
  executions: Record<string, Execution[]>;
  setExecutions: (dcaId: string, executions: Execution[]) => void;
  addExecution: (dcaId: string, execution: Execution) => void;

  // UI State
  isCreateModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
  selectedDCA: DCAConfig | null;
  setSelectedDCA: (dca: DCAConfig | null) => void;

  // Actions
  fetchShieldedBalances: () => Promise<void>;
  fetchDCAConfigs: (force?: boolean) => Promise<void>;
  createDCA: (params: CreateDCAParamsWithSession) => Promise<DCAConfig | null>;
  pauseDCA: (id: string) => Promise<void>;
  resumeDCA: (id: string) => Promise<void>;
  cancelDCA: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Wallet
  isConnected: false,
  walletAddress: null,
  setWallet: (address) =>
    set({
      isConnected: !!address,
      walletAddress: address,
      // Reset fetch flags when wallet changes
      hasFetchedConfigs: false,
      hasFetchedBalances: false,
      dcaConfigs: address ? get().dcaConfigs : [],
      shieldedBalances: address ? get().shieldedBalances : [],
    }),

  // Shielded Balances
  shieldedBalances: [],
  isLoadingBalances: false,
  hasFetchedBalances: false,
  setShieldedBalances: (balances) => set({ shieldedBalances: balances, hasFetchedBalances: true }),
  setLoadingBalances: (loading) => set({ isLoadingBalances: loading }),

  // DCA Configs
  dcaConfigs: [],
  isLoadingConfigs: false,
  hasFetchedConfigs: false,
  setDCAConfigs: (configs) => set({ dcaConfigs: configs, hasFetchedConfigs: true }),
  addDCAConfig: (config) =>
    set((state) => ({ dcaConfigs: [...state.dcaConfigs, config] })),
  updateDCAConfig: (id, updates) =>
    set((state) => ({
      dcaConfigs: state.dcaConfigs.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  setLoadingConfigs: (loading) => set({ isLoadingConfigs: loading }),

  // Executions
  executions: {},
  setExecutions: (dcaId, executions) =>
    set((state) => ({
      executions: { ...state.executions, [dcaId]: executions },
    })),
  addExecution: (dcaId, execution) =>
    set((state) => ({
      executions: {
        ...state.executions,
        [dcaId]: [...(state.executions[dcaId] || []), execution],
      },
    })),

  // UI State
  isCreateModalOpen: false,
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  selectedDCA: null,
  setSelectedDCA: (dca) => set({ selectedDCA: dca }),

  // Actions
  fetchShieldedBalances: async () => {
    // This is now handled by useShieldedBalance hook with real Privacy Cash SDK
    set({ isLoadingBalances: false });
  },

  fetchDCAConfigs: async (force = false) => {
    const { walletAddress, isLoadingConfigs, hasFetchedConfigs } = get();
    // Prevent duplicate fetches - check if already fetched or currently loading
    if (!walletAddress || isLoadingConfigs || (hasFetchedConfigs && !force)) return;

    set({ isLoadingConfigs: true });

    try {
      const response = await fetch('/api/dca/list', {
        headers: {
          'x-wallet-address': walletAddress,
        },
      });
      if (response.ok) {
        const configs = await response.json();
        set({ dcaConfigs: configs, isLoadingConfigs: false, hasFetchedConfigs: true });
      } else {
        set({ isLoadingConfigs: false, hasFetchedConfigs: true });
      }
    } catch (error) {
      console.error('Error fetching DCA configs:', error);
      set({ isLoadingConfigs: false });
    }
  },

  createDCA: async (params: CreateDCAParamsWithSession) => {
    const { walletAddress } = get();
    if (!walletAddress) {
      console.error('Wallet not connected');
      return null;
    }

    try {
      const response = await fetch('/api/dca/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({
          ...params,
          walletAddress,
          encryptedData: params.sessionKeypairBase64,
        }),
      });

      if (response.ok) {
        const config = await response.json();
        get().addDCAConfig(config);
        return config;
      }

      const error = await response.json();
      console.error('Error creating DCA:', error);
      return null;
    } catch (error) {
      console.error('Error creating DCA:', error);
      return null;
    }
  },

  pauseDCA: async (id: string) => {
    const { walletAddress } = get();
    if (!walletAddress) return;

    try {
      const response = await fetch(`/api/dca/${id}/pause`, {
        method: 'POST',
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (response.ok) {
        get().updateDCAConfig(id, { status: 'paused' });
      }
    } catch (error) {
      console.error('Error pausing DCA:', error);
    }
  },

  resumeDCA: async (id: string) => {
    const { walletAddress } = get();
    if (!walletAddress) return;

    try {
      const response = await fetch(`/api/dca/${id}/pause`, {
        method: 'DELETE',
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (response.ok) {
        get().updateDCAConfig(id, { status: 'active' });
      }
    } catch (error) {
      console.error('Error resuming DCA:', error);
    }
  },

  cancelDCA: async (id: string) => {
    const { walletAddress } = get();
    if (!walletAddress) return;

    try {
      const response = await fetch(`/api/dca/${id}/cancel`, {
        method: 'POST',
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (response.ok) {
        get().updateDCAConfig(id, { status: 'cancelled' });
      }
    } catch (error) {
      console.error('Error cancelling DCA:', error);
    }
  },
}));
