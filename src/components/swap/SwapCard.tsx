'use client';

import { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { TokenInput } from './TokenInput';
import { SwapSettings } from './SwapSettings';
import { useAccount } from 'wagmi';

export function SwapCard() {
  const { isConnected } = useAccount();
  const [slippage, setSlippage] = useState(0.5);
  const [tokenInAmount, setTokenInAmount] = useState('');
  const [tokenOutAmount, setTokenOutAmount] = useState('');

  const handleSwapTokens = () => {
    setTokenInAmount(tokenOutAmount);
    setTokenOutAmount(tokenInAmount);
  };

  return (
    <Card variant="elevated" className="w-full max-w-md mx-auto">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="text-lg font-semibold text-white">Swap</h2>
          <SwapSettings slippage={slippage} onSlippageChange={setSlippage} />
        </div>

        {/* Token Inputs */}
        <div className="relative px-2 pb-2">
          <TokenInput
            label="You Pay"
            value={tokenInAmount}
            onChange={setTokenInAmount}
          />

          {/* Swap Direction Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button
              onClick={handleSwapTokens}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 border-2 border-gray-900 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </button>
          </div>

          <TokenInput
            label="You Receive"
            value={tokenOutAmount}
            onChange={setTokenOutAmount}
            readOnly
          />
        </div>

        {/* Swap Info */}
        {tokenInAmount && (
          <div className="mx-4 mb-3 rounded-xl bg-gray-800/50 p-3 text-sm text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Price Impact</span>
              <span className="text-green-400">{'< 0.01%'}</span>
            </div>
            <div className="flex justify-between">
              <span>Max Slippage</span>
              <span>{slippage}%</span>
            </div>
            <div className="flex justify-between">
              <span>Network Fee</span>
              <span>~$2.50</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="p-4 pt-1">
          {!isConnected ? (
            <Button size="lg" disabled>
              Connect Wallet
            </Button>
          ) : !tokenInAmount ? (
            <Button size="lg" disabled>
              Enter an amount
            </Button>
          ) : (
            <Button size="lg">
              Swap
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
