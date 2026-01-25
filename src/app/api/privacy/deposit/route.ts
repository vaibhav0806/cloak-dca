import { NextRequest, NextResponse } from 'next/server';
import { createServerPrivacyClient } from '@/lib/privacy/server';
import { USDC_MINT, SOL_MINT } from '@/lib/solana/constants';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionKeypairBase64, tokenMint, amount, depositAll } = body;

    if (!sessionKeypairBase64) {
      return NextResponse.json(
        { error: 'Session keypair required' },
        { status: 400 }
      );
    }

    if (!tokenMint || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Token mint and positive amount required' },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';

    // Pre-flight check: verify session wallet has funds
    const secretKey = Buffer.from(sessionKeypairBase64, 'base64');
    const keypair = Keypair.fromSecretKey(secretKey);
    const connection = new Connection(rpcUrl);

    // Check SOL balance for fees
    const solBalance = await connection.getBalance(keypair.publicKey);
    console.log(`Session wallet SOL balance: ${solBalance / 1e9} SOL`);

    if (solBalance < 0.005 * 1e9) {
      return NextResponse.json(
        { error: `Insufficient SOL for transaction fees. Have ${(solBalance / 1e9).toFixed(4)} SOL, need at least 0.005 SOL` },
        { status: 400 }
      );
    }

    // If depositing USDC, check USDC balance with retries (RPC can have stale data)
    let actualDepositAmount = amount;

    if (tokenMint === USDC_MINT) {
      const usdcMint = new PublicKey(USDC_MINT);
      const ata = await getAssociatedTokenAddress(usdcMint, keypair.publicKey);

      let usdcAmount = 0;
      let retries = 5;

      while (retries > 0) {
        // Use confirmed commitment to get latest data
        const accountInfo = await connection.getAccountInfo(ata, { commitment: 'confirmed' });

        if (!accountInfo) {
          if (retries === 1) {
            return NextResponse.json(
              { error: 'No USDC token account found in session wallet. Please transfer USDC first.' },
              { status: 400 }
            );
          }
          console.log(`Token account not found, retrying... (${retries - 1} left)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        const usdcBalance = accountInfo.data.readBigUInt64LE(64);
        usdcAmount = Number(usdcBalance) / 1e6;
        console.log(`Session wallet USDC balance: ${usdcAmount} USDC (attempt ${6 - retries})`);

        if (usdcAmount >= amount * 0.99) { // Allow 1% tolerance for rounding
          break;
        }

        // Balance not enough yet, wait and retry
        retries--;
        if (retries > 0) {
          console.log(`Balance ${usdcAmount} < ${amount}, waiting for RPC sync... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (usdcAmount < amount * 0.99) {
        return NextResponse.json(
          { error: `Insufficient USDC. Have ${usdcAmount.toFixed(2)} USDC, trying to deposit ${amount} USDC. RPC may be slow - please try again.` },
          { status: 400 }
        );
      }

      // If depositAll flag is set, deposit the entire session wallet balance
      if (depositAll && usdcAmount > amount) {
        console.log(`depositAll=true: depositing entire balance of ${usdcAmount} USDC instead of requested ${amount} USDC`);
        actualDepositAmount = usdcAmount;
      }
    }

    // Initialize Privacy Cash client
    const privacyClient = await createServerPrivacyClient(rpcUrl, sessionKeypairBase64);

    let result;

    if (tokenMint === SOL_MINT) {
      const lamports = Math.floor(amount * 1e9);
      result = await privacyClient.depositSOL(lamports);
    } else if (tokenMint === USDC_MINT) {
      const baseUnits = Math.floor(actualDepositAmount * 1e6);
      console.log(`Starting deposit of ${baseUnits} USDC base units (${actualDepositAmount} USDC)`);
      result = await privacyClient.depositUSDC(baseUnits);
    } else {
      const baseUnits = Math.floor(amount * 1e6); // Assume 6 decimals for other SPL
      result = await privacyClient.depositSPL(tokenMint, baseUnits);
    }

    // Save transaction to database
    try {
      const walletAddress = request.headers.get('x-wallet-address');
      if (walletAddress) {
        await fetch(new URL('/api/transactions', request.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': walletAddress,
          },
          body: JSON.stringify({
            type: 'deposit',
            token_mint: tokenMint,
            amount: actualDepositAmount,
            tx_signature: result.tx,
            status: 'success',
          }),
        });
      }
    } catch (e) {
      console.warn('Failed to save transaction record:', e);
    }

    return NextResponse.json({ signature: result.tx });
  } catch (error) {
    console.error('Error in deposit endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deposit failed' },
      { status: 500 }
    );
  }
}
