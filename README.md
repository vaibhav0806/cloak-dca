# Cloak - Private Dollar Cost Averaging on Solana

**Website:** [usecloak.xyz](https://usecloak.xyz)

Cloak is a privacy-preserving DCA (Dollar Cost Averaging) application built on Solana. It allows you to accumulate crypto without revealing your trading strategy on-chain.

## The Problem

Traditional DCA on Solana is fully transparent:
- Everyone can see your wallet address
- Your buy schedule is visible
- Your accumulation strategy is public
- Others can front-run or copy your trades

## The Solution

Cloak breaks the on-chain link between you and your trades:

```
Your Wallet → Privacy Pool → Session Wallet → Jupiter Swap → Privacy Pool → Your Wallet
                   ↑                                              ↑
            (unlinkable)                                    (unlinkable)
```

Nobody can connect your deposits to your withdrawals or prove that you're running a DCA strategy.

## How It Works

1. **Deposit** - Shield your USDC into a privacy pool (shared with thousands of others)
2. **Configure DCA** - Set your target token, amount per trade, and frequency
3. **Automatic Execution** - A keeper executes your trades on schedule via Jupiter
4. **Withdraw** - Unshield your accumulated tokens to any wallet

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React, TailwindCSS, shadcn/ui |
| State | Zustand |
| Wallet | Solana Wallet Adapter (Phantom, Solflare) |
| Database | Supabase (Postgres) |
| Privacy | Privacy.cash SDK (ZK proofs) |
| DEX | Jupiter Aggregator |
| Blockchain | Solana |
| Cron | Vercel Cron |
| RPC | Helius |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   API Routes    │────▶│    Supabase     │
│   (Next.js)     │     │   (Next.js)     │     │   (Postgres)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │         Solana Blockchain       │
              │  ┌──────────┐  ┌──────────┐    │
              │  │ Privacy  │  │ Jupiter  │    │
              │  │  .cash   │  │   DEX    │    │
              │  └──────────┘  └──────────┘    │
              └────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Solana wallet (Phantom or Solflare)
- Supabase account
- Helius RPC API key (recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cloak.git
cd cloak

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Solana RPC
NEXT_PUBLIC_HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your_key

# Keeper Authentication
CRON_SECRET=your_random_secret
```

### Database Setup

Run the Supabase migrations:

```bash
npx supabase db push
```

Or manually create the tables in Supabase SQL editor (see `/supabase/migrations/`).

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Testing the Keeper

```bash
# Trigger DCA execution manually
curl -H "Authorization: Bearer your_cron_secret" http://localhost:3000/api/keeper/execute
```

## Deployment

### Vercel (Recommended)

```bash
vercel deploy --prod
```

The cron job is configured in `vercel.json` to run every 15 minutes.

### Environment Variables on Vercel

Set all variables from `.env.local` in Vercel's dashboard.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dca/create` | POST | Create a new DCA |
| `/api/dca/list` | GET | List user's DCAs |
| `/api/dca/[id]/pause` | POST/DELETE | Pause/Resume DCA |
| `/api/dca/[id]/cancel` | POST | Cancel DCA |
| `/api/dca/[id]/executions` | GET | Get execution history |
| `/api/privacy/balance` | POST | Get shielded balances |
| `/api/privacy/deposit` | POST | Deposit to privacy pool |
| `/api/privacy/withdraw` | POST | Withdraw from privacy pool |
| `/api/keeper/execute` | GET | Execute due DCAs (cron) |

## Privacy Model

| Data | On-Chain Visible? |
|------|-------------------|
| Deposit to privacy pool | Yes |
| Which UTXO is yours | No |
| Session wallet swaps | Yes |
| Link: Your wallet ↔ Session wallet | No |
| DCA schedule/amounts | No |
| Link: Deposit ↔ Withdrawal | No |

## Fees

- **Privacy.cash Protocol Fee**: ~70-80% of withdrawal (for relayer + ZK verification)
- **Jupiter Swap Fee**: ~0.1-0.5% (standard DEX fees)
- **Solana Transaction Fee**: ~0.000005 SOL per transaction

## Limitations

- Minimum DCA frequency: 15 minutes (Vercel cron limit)
- Privacy.cash fees can be significant for small amounts
- Session keypair stored as base64 (not encrypted) - for hackathon demo only

## Security Considerations

For production use:
- Encrypt session keypairs before storing
- Add rate limiting to API endpoints
- Implement proper error recovery for failed re-shielding
- Add monitoring and alerts for keeper failures

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT

## Acknowledgments

- [Privacy.cash](https://privacy.cash) - Privacy pool infrastructure
- [Jupiter](https://jup.ag) - DEX aggregation
- [Helius](https://helius.dev) - Solana RPC
- [Supabase](https://supabase.com) - Database

---

Built for the Privacy.cash Hackathon
