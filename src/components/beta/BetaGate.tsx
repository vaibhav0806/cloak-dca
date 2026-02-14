'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';

const CODE_LENGTH = 6;

export function BetaGate() {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const redeemBetaCode = useAppStore((state) => state.redeemBetaCode);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const submitCode = useCallback(async (fullCode: string) => {
    setIsVerifying(true);
    setError(null);

    const result = await redeemBetaCode(fullCode);

    if (!result.success) {
      setError(result.error || 'Invalid invite code');
      setIsVerifying(false);
      setCode(Array(CODE_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  }, [redeemBetaCode]);

  const handleChange = (index: number, value: string) => {
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);
    setError(null);

    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (char && index === CODE_LENGTH - 1) {
      const fullCode = newCode.join('');
      if (fullCode.length === CODE_LENGTH) {
        submitCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const fullCode = code.join('');
      if (fullCode.length === CODE_LENGTH) {
        submitCode(fullCode);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CODE_LENGTH);

    if (pasted.length > 0) {
      const newCode = Array(CODE_LENGTH).fill('');
      for (let i = 0; i < pasted.length; i++) {
        newCode[i] = pasted[i];
      }
      setCode(newCode);
      setError(null);

      if (pasted.length === CODE_LENGTH) {
        submitCode(pasted);
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
    }
  };

  return (
    <div className="min-h-[calc(100svh-5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Title */}
        <h2 className="text-2xl font-medium mb-2">Private Beta</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Enter your 6-digit invite code to access cloak<span className="text-accent">.</span>
        </p>

        {/* Code input */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-6">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={isVerifying}
              className={`
                w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-mono font-medium
                rounded-lg border bg-card/50 outline-none
                transition-all duration-200
                ${error
                  ? 'border-red-500/50 text-red-400'
                  : digit
                    ? 'border-accent/40 text-foreground'
                    : 'border-border hover:border-accent/20'
                }
                focus:border-accent/60 focus:ring-1 focus:ring-accent/20
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        )}

        {/* Loading state */}
        {isVerifying && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="relative">
              <div className="h-4 w-4 rounded-full border-2 border-muted" />
              <div className="absolute inset-0 h-4 w-4 rounded-full border-2 border-transparent border-t-accent animate-spin" />
            </div>
            <span className="text-sm text-muted-foreground">Verifying...</span>
          </div>
        )}

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground/50 mt-8">
          Don&apos;t have a code? Reach out <a href="mailto:prasadjs178@gmail.com" className="underline hover:text-foreground transition-colors">here</a> to get early access.
        </p>
      </div>
    </div>
  );
}
