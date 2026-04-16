'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { TokenInput, TokenOption } from './TokenInput';
import { useSwap, usePoolsForPair } from '@/lib/hooks/useSwap';
import { TOKEN_LIST } from '@/lib/utils/constant';

export function SwapCard() {
  const { isConnected } = useAccount();

  const defaultTokenIn = TOKEN_LIST[0] as TokenOption;
  const defaultTokenOut = TOKEN_LIST[1] as TokenOption;
  const [tokenIn, setTokenIn] = useState<TokenOption>(defaultTokenIn);
  const [tokenOut, setTokenOut] = useState<TokenOption>(defaultTokenOut);
  const [swapMode, setSwapMode] = useState<'exactIn' | 'exactOut'>('exactIn');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');

  const { pools, indexPath, isLoading: isPoolsLoading } = usePoolsForPair(
    tokenIn?.address,
    tokenOut?.address,
  );
  console.log('usePoolsForPair-------------', pools, indexPath);

  const {
    quoteExactInput,
    quoteExactOutput,
    isQuoting,
    quoteError,
    executeExactInput,
    executeExactOutput,
    isPending,
    isConfirming,
    isSuccess,
    error: swapError,
    reset,
  } = useSwap();

  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runQuoteExactIn = useCallback(
    async (raw: string) => {
      if (!raw || raw === '0' || indexPath.length === 0) {
        setAmountOut('');
        return;
      }
      const amt = parseUnits(raw, tokenIn.decimals);
      if (amt === 0n) {
        setAmountOut('');
        return;
      }
      const result = await quoteExactInput({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        indexPath,
        amountIn: amt,
      });
      if (result != null) {
        setAmountOut(formatUnits(result, tokenOut.decimals));
      }
    },
    [tokenIn, tokenOut, indexPath, quoteExactInput],
  );

  const runQuoteExactOut = useCallback(
    async (raw: string) => {
      if (!raw || raw === '0' || indexPath.length === 0) {
        setAmountIn('');
        return;
      }
      const amt = parseUnits(raw, tokenOut.decimals);
      if (amt === 0n) {
        setAmountIn('');
        return;
      }
      const result = await quoteExactOutput({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        indexPath,
        amountOut: amt,
      });
      if (result != null) {
        setAmountIn(formatUnits(result, tokenIn.decimals));
      }
    },
    [tokenIn, tokenOut, indexPath, quoteExactOutput],
  );

  const scheduleQuote = useCallback(
    (mode: 'exactIn' | 'exactOut', value: string) => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
      quoteTimer.current = setTimeout(() => {
        if (mode === 'exactIn') runQuoteExactIn(value);
        else runQuoteExactOut(value);
      }, 500);
    },
    [runQuoteExactIn, runQuoteExactOut],
  );

  const handleAmountInChange = (val: string) => {
    setSwapMode('exactIn');
    setAmountIn(val);
    scheduleQuote('exactIn', val);
  };

  const handleAmountOutChange = (val: string) => {
    setSwapMode('exactOut');
    setAmountOut(val);
    scheduleQuote('exactOut', val);
  };

  const handleFlipTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
    setSwapMode((m) => (m === 'exactIn' ? 'exactOut' : 'exactIn'));
    reset();
  };

  const handleTokenInChange = (token: TokenOption) => {
    setTokenIn(token);
    setAmountOut('');
    reset();
    if (amountIn) scheduleQuote('exactIn', amountIn);
  };

  const handleTokenOutChange = (token: TokenOption) => {
    setTokenOut(token);
    setAmountOut('');
    reset();
    if (amountIn) scheduleQuote('exactIn', amountIn);
  };

  useEffect(() => {
    if (indexPath.length > 0) {
      if (swapMode === 'exactIn' && amountIn) scheduleQuote('exactIn', amountIn);
      else if (swapMode === 'exactOut' && amountOut) scheduleQuote('exactOut', amountOut);
    }
  }, [indexPath]);

  useEffect(() => {
    if (isSuccess) {
      setAmountIn('');
      setAmountOut('');
    }
  }, [isSuccess]);

  const handleSwap = async () => {
    if (indexPath.length === 0) return;
    try {
      if (swapMode === 'exactIn') {
        const aIn = parseUnits(amountIn, tokenIn.decimals);
        const aOut = amountOut ? parseUnits(amountOut, tokenOut.decimals) : 0n;
        await executeExactInput({
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          indexPath,
          amountIn: aIn,
          amountOutExpected: aOut,
        });
      } else {
        const aOut = parseUnits(amountOut, tokenOut.decimals);
        const aIn = amountIn ? parseUnits(amountIn, tokenIn.decimals) : 0n;
        await executeExactOutput({
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          indexPath,
          amountOut: aOut,
          amountInExpected: aIn,
        });
      }
    } catch (e) {
      console.error('swap error:', e);
    }
  };

  const noPools = !isPoolsLoading && pools.length === 0 && !!tokenIn && !!tokenOut;
  const noAmount = !amountIn && !amountOut;
  const sameToken =
    tokenIn?.address.toLowerCase() === tokenOut?.address.toLowerCase();
  const isLoading = isPending || isConfirming;

  const getButtonLabel = () => {
    if (!isConnected) return 'Connect Wallet';
    if (sameToken) return 'Select Different Tokens';
    if (isPoolsLoading) return 'Loading Pools...';
    if (noPools) return 'No Pool Available';
    if (noAmount) return 'Enter an Amount';
    if (isQuoting) return 'Quoting...';
    if (isPending) return 'Confirm in Wallet...';
    if (isConfirming) return 'Transaction Pending...';
    if (isSuccess) return '✓ Swap Successful';
    return 'Swap';
  };

  const isButtonDisabled =
    !isConnected ||
    sameToken ||
    isPoolsLoading ||
    noPools ||
    noAmount ||
    isQuoting ||
    isLoading ||
    isSuccess;

  const exchangeRate =
    amountIn && amountOut && parseFloat(amountIn) > 0
      ? (parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)
      : null;

  return (
    <Card variant="elevated" className="w-full max-w-md mx-auto">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 pb-3">
          <h2 className="text-lg font-semibold text-white">Swap</h2>
        </div>

        <div className="relative px-2 pb-2">
          <TokenInput
            label="You Pay"
            value={amountIn}
            onChange={handleAmountInChange}
            selectedToken={tokenIn}
            onTokenChange={handleTokenInChange}
            excludeAddress={tokenOut?.address}
            isLoading={swapMode === 'exactOut' && isQuoting}
          />

          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button
              onClick={handleFlipTokens}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 border-2 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 hover:border-gray-600 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </button>
          </div>

          <TokenInput
            label="You Receive"
            value={amountOut}
            onChange={handleAmountOutChange}
            selectedToken={tokenOut}
            onTokenChange={handleTokenOutChange}
            excludeAddress={tokenIn?.address}
            isLoading={swapMode === 'exactIn' && isQuoting}
          />
        </div>

        {(exchangeRate || quoteError) && (
          <div className="mx-4 mb-3 rounded-xl bg-gray-800/50 p-3 text-sm space-y-1.5">
            {exchangeRate && !quoteError && (
              <>
                <div className="flex justify-between text-gray-400">
                  <span>Rate</span>
                  <span className="text-white">
                    1 {tokenIn?.symbol} ≈ {exchangeRate} {tokenOut?.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Route</span>
                  <span className="text-white">
                    {tokenIn?.symbol}
                    {indexPath.length > 0 ? ` → [${indexPath.join('→')}] → ` : ' → '}
                    {tokenOut?.symbol}
                  </span>
                </div>
              </>
            )}
            {quoteError && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>Quote failed: {quoteError}</span>
              </div>
            )}
          </div>
        )}

        {swapError && (
          <div className="mx-4 mb-3 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
            {(swapError as any)?.shortMessage ?? swapError?.message ?? 'Transaction failed'}
          </div>
        )}

        <div className="p-4 pt-1">
          <Button
            size="lg"
            disabled={isButtonDisabled}
            onClick={handleSwap}
            className={isSuccess ? 'bg-green-600 hover:bg-green-600' : ''}
          >
            {getButtonLabel()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
