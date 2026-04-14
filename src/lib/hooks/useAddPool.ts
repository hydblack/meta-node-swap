'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { POOLMANAGER_ABI } from '../contracts/abis';
import { CONTRACT_ADDRESSES } from '../utils/constant';

export interface AddPoolParams {
  token0: `0x${string}`;
  token1: `0x${string}`;
  fee: number;
  tickLower: number;
  tickUpper: number;
  sqrtPriceX96: bigint;
}

export function useAddPool() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash });

  const addPool = (params: AddPoolParams) => {
    writeContract({
      address: CONTRACT_ADDRESSES.PoolManager,
      abi: POOLMANAGER_ABI,
      functionName: 'createAndInitializePoolIfNecessary',
      args: [
        {
          token0: params.token0,
          token1: params.token1,
          fee: params.fee,
          tickLower: params.tickLower,
          tickUpper: params.tickUpper,
          sqrtPriceX96: params.sqrtPriceX96,
        },
      ],
    });
  };

  return {
    addPool,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
    receipt,
    reset,
  };
}
