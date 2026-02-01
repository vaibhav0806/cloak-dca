// Umami analytics wrapper
// https://umami.is/docs/tracker-functions

type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: EventData) => void;
    };
  }
}

export function trackEvent(event: string, data?: EventData) {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(event, data);
  }
}

// Pre-defined events for type safety
export const analytics = {
  walletConnected: () => trackEvent('wallet_connected'),
  walletDisconnected: () => trackEvent('wallet_disconnected'),

  depositStarted: (amount: number) => trackEvent('deposit_started', { amount }),
  depositCompleted: (amount: number) => trackEvent('deposit_completed', { amount }),

  dcaCreated: (outputToken: string, totalAmount: number, frequencyHours: number) =>
    trackEvent('dca_created', { output_token: outputToken, total_amount: totalAmount, frequency_hours: frequencyHours }),
  dcaPaused: () => trackEvent('dca_paused'),
  dcaResumed: () => trackEvent('dca_resumed'),
  dcaCancelled: () => trackEvent('dca_cancelled'),

  withdrawStarted: (token: string, amount: number) => trackEvent('withdraw_started', { token, amount }),
  withdrawCompleted: (token: string, amount: number) => trackEvent('withdraw_completed', { token, amount }),
};
