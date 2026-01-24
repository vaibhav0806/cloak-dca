'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Copy, ExternalLink, Check } from 'lucide-react';
import { useState } from 'react';

export function WalletButton() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [copied, setCopied] = useState(false);

  const handleConnect = () => setVisible(true);

  const handleCopy = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExplorer = () => {
    if (publicKey) {
      window.open(`https://explorer.solana.com/address/${publicKey.toBase58()}`, '_blank');
    }
  };

  const formatAddress = (address: string) => `${address.slice(0, 4)}···${address.slice(-4)}`;

  if (!connected || !publicKey) {
    return (
      <Button onClick={handleConnect}>
        Connect
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-md hover:border-accent/50 transition-colors bg-card">
          <span className="status-dot active" />
          <span className="text-mono">{formatAddress(publicKey.toBase58())}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 card">
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <Check className="mr-2 h-4 w-4 accent" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? 'Copied' : 'Copy address'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExplorer}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
