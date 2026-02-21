import {
  Keypair,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { GRAIL_CONFIG } from './config';

interface GoldPriceResponse {
  price: number;
  unit: string;
  currency: string;
  timestamp: string;
}

interface EstimateResponse {
  estimatedUsdc: number;
  estimatedUsdcAmount: number;
  goldAmount: number;
  pricePerOunce: number;
}

interface UserResponse {
  userId: string;
  userPda: string;
  transaction?: {
    serializedTx: string;
    signingInstructions: {
      walletType: string;
      signers: string[];
      expiresAt: string;
    };
  };
}

interface PurchaseResponse {
  transaction: {
    serializedTx: string;
    signingInstructions: {
      walletType: string;
      signers: string[];
      expiresAt: string;
    };
  };
  goldAmount: number;
  estimatedGoldAmount?: number;
  estimatedUsdcCost?: number;
  quoteUsdcAmount?: number;
  maxUsdcAmount?: number;
}

interface SaleResponse {
  transaction: {
    serializedTx: string;
    signingInstructions: {
      walletType: string;
      signers: string[];
      expiresAt: string;
    };
  };
  estimatedGoldAmount: number;
  estimatedUsdcReceived: number;
}

interface SubmitResponse {
  txId: string;
  status: string;
}

class GrailService {
  private apiKey: string;
  private baseUrl: string;
  private partnerId: string;
  private privateKey: string;

  constructor() {
    this.apiKey = GRAIL_CONFIG.apiKey;
    this.baseUrl = GRAIL_CONFIG.baseUrl;
    this.partnerId = GRAIL_CONFIG.partnerId;
    this.privateKey = GRAIL_CONFIG.privateKey;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    };
  }

  private getExecutiveKeypair(): Keypair {
    const secretKey = bs58.decode(this.privateKey);
    return Keypair.fromSecretKey(secretKey);
  }

  /** Expose executive authority keypair for co-signing (self-custody) */
  getExecutiveKeypairPublic(): Keypair {
    return this.getExecutiveKeypair();
  }

  /** Unwrap GRAIL's { success, data } response envelope */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private unwrap(json: any): any {
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data;
    }
    return json;
  }

  async healthCheck(): Promise<{ status: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`GRAIL health check failed: ${res.status}`);
    return res.json();
  }

  async getGoldPrice(): Promise<GoldPriceResponse> {
    const res = await fetch(`${this.baseUrl}/api/trading/gold/price`);
    if (!res.ok) throw new Error(`Failed to get gold price: ${res.status}`);
    const json = await res.json();
    const data = this.unwrap(json);
    return {
      price: parseFloat(data.price),
      unit: data.unit,
      currency: data.currency,
      timestamp: data.timestamp,
    };
  }

  async estimateBuy(goldAmount: number): Promise<EstimateResponse> {
    const res = await fetch(`${this.baseUrl}/api/trading/estimate/buy`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ goldAmount }),
    });
    if (!res.ok) throw new Error(`Failed to estimate buy: ${res.status} ${await res.text()}`);
    const json = await res.json();
    return this.unwrap(json);
  }

  async estimateSell(goldAmount: number): Promise<EstimateResponse> {
    const res = await fetch(`${this.baseUrl}/api/trading/estimate/sell`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ goldAmount }),
    });
    if (!res.ok) throw new Error(`Failed to estimate sell: ${res.status} ${await res.text()}`);
    const json = await res.json();
    return this.unwrap(json);
  }

  async createUser(kycHash: string, userWalletAddress?: string): Promise<UserResponse> {
    const body: Record<string, string> = { kycHash };
    if (userWalletAddress) {
      body.userWalletAddress = userWalletAddress;
    }
    const res = await fetch(`${this.baseUrl}/api/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create GRAIL user: ${res.status} ${await res.text()}`);
    const json = await res.json();
    return this.unwrap(json);
  }

  async getUser(userId: string): Promise<{ userId: string; goldBalance: number; userPda: string }> {
    const res = await fetch(`${this.baseUrl}/api/users/${userId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to get GRAIL user: ${res.status} ${await res.text()}`);
    const json = await res.json();
    return this.unwrap(json);
  }

  async purchaseGoldForUser(
    userId: string,
    goldAmount: number,
    maxUsdcAmount: number
  ): Promise<PurchaseResponse> {
    const res = await fetch(`${this.baseUrl}/api/trading/purchases/user`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        userId,
        goldAmount,
        maxUsdcAmount,
      }),
    });
    if (!res.ok) throw new Error(`Failed to purchase gold: ${res.status} ${await res.text()}`);
    const json = await res.json();
    return this.unwrap(json);
  }

  async purchaseGoldForPartner(
    goldAmount: number,
    maxUsdcAmount: number
  ): Promise<PurchaseResponse> {
    const res = await fetch(`${this.baseUrl}/api/trading/purchases/partner`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        goldAmount,
        maxUsdcAmount,
      }),
    });
    if (!res.ok) throw new Error(`Failed to purchase gold (partner): ${res.status} ${await res.text()}`);
    const json = await res.json();
    return this.unwrap(json);
  }

  async sellGoldForUser(
    userId: string,
    goldAmount: number,
    minUsdcAmount: number
  ): Promise<SaleResponse> {
    const res = await fetch(`${this.baseUrl}/api/trading/sales/user`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        userId,
        goldAmount,
        minUsdcAmount,
      }),
    });
    if (!res.ok) throw new Error(`Failed to sell gold: ${res.status} ${await res.text()}`);
    const json = await res.json();
    return this.unwrap(json);
  }

  signTransaction(
    serializedTx: string,
    type: 'versioned' | 'legacy'
  ): Buffer {
    const keypair = this.getExecutiveKeypair();
    const txBuffer = Buffer.from(serializedTx, 'base64');

    if (type === 'versioned') {
      const tx = VersionedTransaction.deserialize(txBuffer);
      tx.sign([keypair]);
      return Buffer.from(tx.serialize());
    } else {
      const tx = Transaction.from(txBuffer);
      tx.partialSign(keypair);
      return Buffer.from(tx.serialize());
    }
  }

  async submitTransaction(signedTx: Buffer): Promise<SubmitResponse> {
    const res = await fetch(`${this.baseUrl}/api/transactions/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signedTransaction: signedTx.toString('base64'),
      }),
    });
    if (!res.ok) throw new Error(`Failed to submit transaction: ${res.status} ${await res.text()}`);
    const json = await res.json();
    return this.unwrap(json);
  }
}

export const grailService = new GrailService();
export type { GoldPriceResponse, EstimateResponse, UserResponse, PurchaseResponse, SubmitResponse };
