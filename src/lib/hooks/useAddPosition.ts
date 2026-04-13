"use client";

import { useMemo } from "react";
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseUnits } from "viem";
import {
  POOLMANAGER_ABI,
  POSITIONMANAGER_ABI,
  ERC20_ABI,
} from "../contracts/abis";
import { CONTRACT_ADDRESSES } from "../utils/constant";

// PoolInfo 从合约返回的原始结构
export interface RawPoolInfo {
  pool: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  index: number;
  fee: number;
  feeProtocol: number;
  tickLower: number;
  tickUpper: number;
  tick: number;
  sqrtPriceX96: bigint;
  liquidity: bigint;
}

export interface PairOption {
  token0: `0x${string}`;
  token1: `0x${string}`;
}

/** 获取所有交易对（用于 token 下拉框联动） */
export function useGetPairs() {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.PoolManager,
    abi: POOLMANAGER_ABI,
    functionName: "getPairs",
  });

  const pairs = useMemo<PairOption[]>(() => {
    if (!Array.isArray(data)) return [];
    return data as PairOption[];
  }, [data]);

  return { pairs, isLoading };
}

/** 获取所有交易池（用于根据选定 token pair 过滤出对应的池与费率） */
export function useGetAllPools() {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.PoolManager,
    abi: POOLMANAGER_ABI,
    functionName: "getAllPools",
  });

  const pools = useMemo<RawPoolInfo[]>(() => {
    if (!Array.isArray(data)) return [];
    return data.map((p: any) => ({
      pool: p.pool,
      token0: p.token0,
      token1: p.token1,
      index: Number(p.index),
      fee: Number(p.fee),
      feeProtocol: Number(p.feeProtocol),
      tickLower: Number(p.tickLower),
      tickUpper: Number(p.tickUpper),
      tick: Number(p.tick),
      sqrtPriceX96: BigInt(p.sqrtPriceX96),
      liquidity: BigInt(p.liquidity),
    }));
  }, [data]);

  return { pools, isLoading };
}

/** 根据选定的 token0/token1 过滤出可用的池列表（含费率、index） */
export function useFilteredPools(
  token0?: `0x${string}`,
  token1?: `0x${string}`
) {
  const { pools, isLoading } = useGetAllPools();

  const filtered = useMemo<RawPoolInfo[]>(() => {
    if (!token0 || !token1) return [];
    const a = token0.toLowerCase();
    const b = token1.toLowerCase();
    return pools.filter((p) => {
      const pa = p.token0.toLowerCase();
      const pb = p.token1.toLowerCase();
      return (pa === a && pb === b) || (pa === b && pb === a);
    });
  }, [pools, token0, token1]);

  return { filteredPools: filtered, isLoading };
}

/** 查询某个 ERC20 token 对当前用户的余额（Position 模块专用） */
export function usePositionTokenBalance(
  tokenAddress?: `0x${string}`,
  decimals = 18
) {
  const { address } = useAccount();

  const { data: balance, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });

  const formatted = useMemo(() => {
    if (balance === undefined || balance === null) return "0";
    const raw = (balance as bigint).toString();
    // 简单格式化：转换为 decimals 精度
    try {
      const num = Number(balance as bigint) / Math.pow(10, decimals);
      return num.toFixed(4);
    } catch {
      return raw;
    }
  }, [balance, decimals]);

  return {
    raw: (balance as bigint | undefined) ?? 0n,
    formatted,
    isLoading,
    refetch,
  };
}

/** 查询 token 对 PositionManager 的授权额度（Position 模块专用） */
export function usePositionTokenAllowance(tokenAddress?: `0x${string}`) {
  const { address } = useAccount();
  const spender = CONTRACT_ADDRESSES.PositionManager;

  const { data: allowance, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, spender] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });

  return {
    allowance: (allowance as bigint | undefined) ?? 0n,
    isLoading,
    refetch,
  };
}

/** approve ERC20 token 给 PositionManager（Position 模块专用） */
export function usePositionTokenApprove() {
  const {
    writeContract,
    data: hash,
    isPending,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = (tokenAddress: `0x${string}`, amount: bigint) => {
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.PositionManager, amount],
    });
  };

  return { approve, isPending, isConfirming, isSuccess, hash, reset };
}

export interface MintPositionParams {
  token0: `0x${string}`;
  token1: `0x${string}`;
  index: number;
  amount0Desired: string; // human-readable
  amount1Desired: string; // human-readable
  decimals0: number;
  decimals1: number;
  recipient: `0x${string}`;
  deadlineSeconds?: number; // default 1200 (20 min)
}

/** 调用 PositionManager.mint() 新增仓位 */
export function useMintPosition() {
  const {
    writeContract,
    data: hash,
    isPending,
    reset,
    error,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash });

  const mint = ({
    token0,
    token1,
    index,
    amount0Desired,
    amount1Desired,
    decimals0,
    decimals1,
    recipient,
    deadlineSeconds = 1200,
  }: MintPositionParams) => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
    writeContract({
      address: CONTRACT_ADDRESSES.PositionManager,
      abi: POSITIONMANAGER_ABI,
      functionName: "mint",
      args: [
        {
          token0,
          token1,
          index,
          amount0Desired: parseUnits(amount0Desired, decimals0),
          amount1Desired: parseUnits(amount1Desired, decimals1),
          recipient,
          deadline,
        },
      ],
    });
  };

  return { mint, isPending, isConfirming, isSuccess, hash, receipt, error, reset };
}
