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
  goldAmount: number;
  pricePerOunce: number;
}

interface UserResponse {
  userId: string;
  userPda: string;
  transaction?: string; // base64 serialized legacy transaction
}

interface PurchaseResponse {
  transaction: string; // base64 serialized versioned transaction
  estimatedGoldAmount: number;
  estimatedUsdcCost: number;
}

interface SaleResponse {
  transaction: string;
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

  async healthCheck(): Promise<{ status: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`GRAIL health check failed: ${res.status}`);
    return res.json();
  }

  async getGoldPrice(): Promise<GoldPriceResponse> {
    const res = await fetch(`${this.baseUrl}/api/trading/gold/price`);
    if (!res.ok) throw new Error(`Failed to get gold price: ${res.status}`);
    const json = await res.json();
    // GRAIL wraps response in { success, data: { price, unit, currency, timestamp } }
    const data = json.data || json;
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
    return res.json();
  }

  async estimateSell(goldAmount: number): Promise<EstimateResponse> {
    const res = await fetch(`${this.baseUrl}/api/trading/estimate/sell`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ goldAmount }),
    });
    if (!res.ok) throw new Error(`Failed to estimate sell: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async createUser(kycHash: string): Promise<UserResponse> {
    const res = await fetch(`${this.baseUrl}/api/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        partnerId: this.partnerId,
        kycHash,
      }),
    });
    if (!res.ok) throw new Error(`Failed to create GRAIL user: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async getUser(userId: string): Promise<{ userId: string; goldBalance: number; userPda: string }> {
    const res = await fetch(`${this.baseUrl}/api/users/${userId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to get GRAIL user: ${res.status} ${await res.text()}`);
    return res.json();
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
        partnerId: this.partnerId,
      }),
    });
    if (!res.ok) throw new Error(`Failed to purchase gold: ${res.status} ${await res.text()}`);
    return res.json();
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
        partnerId: this.partnerId,
      }),
    });
    if (!res.ok) throw new Error(`Failed to sell gold: ${res.status} ${await res.text()}`);
    return res.json();
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
        transaction: signedTx.toString('base64'),
      }),
    });
    if (!res.ok) throw new Error(`Failed to submit transaction: ${res.status} ${await res.text()}`);
    return res.json();
  }
}

export const grailService = new GrailService();
export type { GoldPriceResponse, EstimateResponse, UserResponse, PurchaseResponse, SubmitResponse };
