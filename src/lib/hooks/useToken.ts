'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';
import { ERC20_ABI } from '../contracts/abis';

/**
 * 查询 ERC20 Token 余额
 */
export function useTokenBalance(
  tokenAddress?: `0x${string}`,
  decimals = 18
) {
  const { address } = useAccount();

  const { data: balance, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });

  return {
    balance: balance ?? 0n,
    decimals,
    isLoading,
    refetch,
  };
}

/**
 * 查询 ERC20 Token 授权额度
 */
export function useTokenAllowance(
  tokenAddress?: `0x${string}`,
  spenderAddress?: `0x${string}`
) {
  const { address } = useAccount();

  const { data: allowance, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && spenderAddress ? [address, spenderAddress] : undefined,
    query: { enabled: !!tokenAddress && !!address && !!spenderAddress },
  });

  return {
    allowance: allowance ?? 0n,
    isLoading,
    refetch,
  };
}

/**
 * ERC20 Token Approve Hook
 */
export function useTokenApprove() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (
    tokenAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    amount: bigint
  ) => {
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amount],
    });
  };

  return {
    approve,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}
