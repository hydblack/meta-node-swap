'use client';

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { SWAPROUTER_ABI } from '../contracts/abis';
import { CONTRACT_ADDRESSES } from '../utils/constant';
import { calculateMinimumReceived } from '../utils/utils';

export interface SwapParams {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  fee: number;
  amountIn: bigint;
  amountOutExpected: bigint;
  slippageTolerance: number; // percentage
  recipient: `0x${string}`;
}

/**
 * Swap 核心 Hook
 */
export function useSwap() {
  const [isQuoting, setIsQuoting] = useState(false);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const routerAddress = CONTRACT_ADDRESSES.SwapRouter;

  const executeSwap = useCallback(
    async (params: SwapParams) => {
      const amountOutMinimum = calculateMinimumReceived(
        params.amountOutExpected,
        params.slippageTolerance
      );

      writeContract({
        address: routerAddress,
        abi: SWAPROUTER_ABI,
        functionName: 'exactInput',
        args: [
          {
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            indexPath: [],
            recipient: params.recipient,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
            amountIn: params.amountIn,
            amountOutMinimum,
            sqrtPriceLimitX96: 0n,
          },
        ],
      });
    },
    [routerAddress, writeContract]
  );

  return {
    executeSwap,
    isQuoting,
    setIsQuoting,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}
