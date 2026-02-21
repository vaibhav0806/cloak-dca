/**
 * Test script: Does Privacy.cash SDK work on devnet?
 *
 * Run: npx tsx scripts/test-privacycash-devnet.ts
 */

import { Keypair } from '@solana/web3.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';

async function main() {
  console.log('=== Privacy.cash Devnet Compatibility Test ===\n');

  // Generate a throwaway keypair for testing
  const testKeypair = Keypair.generate();
  console.log(`Test wallet: ${testKeypair.publicKey.toBase58()}`);
  console.log(`RPC: ${DEVNET_RPC}\n`);

  try {
    console.log('1. Importing privacycash SDK...');
    const { PrivacyCash } = await import('privacycash');
    console.log('   OK - SDK imported\n');

    console.log('2. Initializing with devnet RPC...');
    const client = new PrivacyCash({
      RPC_url: DEVNET_RPC,
      owner: testKeypair.secretKey,
      enableDebug: true,
    });
    console.log('   OK - Client created\n');

    console.log('3. Checking private SOL balance...');
    try {
      const solBalance = await client.getPrivateBalance();
      console.log(`   OK - SOL balance: ${JSON.stringify(solBalance)}\n`);
    } catch (e) {
      console.log(`   FAILED - ${(e as Error).message}\n`);
    }

    console.log('4. Checking private USDC balance...');
    try {
      const usdcBalance = await client.getPrivateBalanceUSDC();
      console.log(`   OK - USDC balance: ${JSON.stringify(usdcBalance)}\n`);
    } catch (e) {
      console.log(`   FAILED - ${(e as Error).message}\n`);
    }

    console.log('=== RESULT: Privacy.cash SDK works on devnet! ===');
  } catch (error) {
    console.error('\n=== RESULT: Privacy.cash SDK DOES NOT work on devnet ===');
    console.error(`Error: ${(error as Error).message}`);
    if ((error as Error).stack) {
      console.error(`Stack: ${(error as Error).stack}`);
    }
    process.exit(1);
  }
}

main().catch(console.error);
