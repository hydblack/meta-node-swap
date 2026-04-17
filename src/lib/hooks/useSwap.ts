"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
  useAccount,
} from "wagmi";
import { POOLMANAGER_ABI, SWAPROUTER_ABI, ERC20_ABI } from "../contracts/abis";
import {
  CONTRACT_ADDRESSES,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
} from "../utils/constant";

/**
 * 根据交易方向返回 sqrtPriceLimitX96。
 *
 * 合约断言 (SPL)：
 *   zeroForOne → limit > MIN_SQRT_PRICE → 使用 MIN_SQRT_PRICE + 1
 *   oneForZero → limit < MAX_SQRT_PRICE → 使用 MAX_SQRT_PRICE - 1
 */
function resolveSqrtPriceLimit(
  pools: PoolInfo[],
  tokenIn: `0x${string}`,
): bigint {
  if (pools.length === 0) return MIN_SQRT_PRICE + 1n;
  // 取流动性最大的池子判断交易方向
  const best = [...pools].sort((a, b) =>
    b.liquidity > a.liquidity ? 1 : b.liquidity < a.liquidity ? -1 : 0,
  )[0];
  const zeroForOne = tokenIn.toLowerCase() === best.token0.toLowerCase();
  return zeroForOne ? MIN_SQRT_PRICE + 1n : MAX_SQRT_PRICE - 1n;
}

export interface PoolInfo {
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

export type SwapMode = "exactIn" | "exactOut";

const MAX_HOPS = 3;

function isPoolActive(pool: PoolInfo): boolean {
  return (
    pool.liquidity > 0n &&
    pool.tick >= pool.tickLower &&
    pool.tick < pool.tickUpper
  );
}

function computeIndexPath(pools: PoolInfo[]): number[] {
  return [...pools]
    .filter(isPoolActive)
    .sort((a, b) => {
      // 流动性大的优先
      if (b.liquidity > a.liquidity) return 1;
      if (b.liquidity < a.liquidity) return -1;
      return 0;
    })
    .slice(0, MAX_HOPS)
    .map((p) => p.index);
}

export function usePoolsForPair(
  tokenIn: `0x${string}` | undefined,
  tokenOut: `0x${string}` | undefined,
) {
  const {
    data: allPools,
    isLoading,
    refetch,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.PoolManager,
    abi: POOLMANAGER_ABI,
    functionName: "getAllPools",
    query: { enabled: true },
  });

  const pools = useMemo<PoolInfo[]>(() => {
    if (!allPools || !tokenIn || !tokenOut) return [];
    const addrIn = tokenIn.toLowerCase();
    const addrOut = tokenOut.toLowerCase();
    return (allPools as any[])
      .filter((p) => {
        const t0 = p.token0.toLowerCase();
        const t1 = p.token1.toLowerCase();
        return (
          (t0 === addrIn && t1 === addrOut) || (t0 === addrOut && t1 === addrIn)
        );
      })
      .map((p) => ({
        pool: p.pool as `0x${string}`,
        token0: p.token0 as `0x${string}`,
        token1: p.token1 as `0x${string}`,
        index: Number(p.index),
        fee: Number(p.fee),
        feeProtocol: Number(p.feeProtocol),
        tickLower: Number(p.tickLower),
        tickUpper: Number(p.tickUpper),
        tick: Number(p.tick),
        sqrtPriceX96: BigInt(p.sqrtPriceX96),
        liquidity: BigInt(p.liquidity),
      }));
  }, [allPools, tokenIn, tokenOut]);

  const indexPath = useMemo(() => computeIndexPath(pools), [pools]);

  return { pools, indexPath, isLoading, refetch };
}

export function useSwap() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const {
    writeContractAsync,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const routerAddress = CONTRACT_ADDRESSES.SwapRouter;

  const quoteExactInput = useCallback(
    async (params: {
      tokenIn: `0x${string}`;
      tokenOut: `0x${string}`;
      pools: PoolInfo[];
      indexPath: number[];
      amountIn: bigint;
    }): Promise<bigint | null> => {
      if (!publicClient) return null;
      setIsQuoting(true);
      setQuoteError(null);
      try {
        const sqrtPriceLimitX96 = resolveSqrtPriceLimit(
          params.pools,
          params.tokenIn,
        );
        const result = await publicClient.simulateContract({
          address: routerAddress,
          abi: SWAPROUTER_ABI,
          functionName: "quoteExactInput",
          args: [
            {
              tokenIn: params.tokenIn,
              tokenOut: params.tokenOut,
              indexPath: params.indexPath.map((i) => i as unknown as number),
              amountIn: params.amountIn,
              sqrtPriceLimitX96,
            },
          ],
        });
        return result.result as bigint;
      } catch (e: any) {
        console.error("quoteExactInput error:", e);
        setQuoteError(e?.shortMessage ?? e?.message ?? "Quote failed");
        return null;
      } finally {
        setIsQuoting(false);
      }
    },
    [publicClient, routerAddress],
  );

  const quoteExactOutput = useCallback(
    async (params: {
      tokenIn: `0x${string}`;
      tokenOut: `0x${string}`;
      pools: PoolInfo[];
      indexPath: number[];
      amountOut: bigint;
    }): Promise<bigint | null> => {
      if (!publicClient) return null;
      setIsQuoting(true);
      setQuoteError(null);
      try {
        const sqrtPriceLimitX96 = resolveSqrtPriceLimit(
          params.pools,
          params.tokenIn,
        );
        const result = await publicClient.simulateContract({
          address: routerAddress,
          abi: SWAPROUTER_ABI,
          functionName: "quoteExactOutput",
          args: [
            {
              tokenIn: params.tokenIn,
              tokenOut: params.tokenOut,
              indexPath: params.indexPath.map((i) => i as unknown as number),
              amountOut: params.amountOut,
              sqrtPriceLimitX96,
            },
          ],
        });
        return result.result as bigint;
      } catch (e: any) {
        console.error("quoteExactOutput error:", e);
        setQuoteError(e?.shortMessage ?? e?.message ?? "Quote failed");
        return null;
      } finally {
        setIsQuoting(false);
      }
    },
    [publicClient, routerAddress],
  );

  const approveToken = useCallback(
    async (tokenAddress: `0x${string}`, amount: bigint): Promise<boolean> => {
      try {
        // 1. 先查当前 allowance
        if (!publicClient || !userAddress) return false;
        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [userAddress, routerAddress],
        });
        if ((allowance as bigint) >= amount) return true; // 已授权足够，跳过

        // 2. 发起 approve 交易
        const txHash = await writeContractAsync({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [routerAddress, amount],
        });

        // 3. 等待确认
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return true;
      } catch (e) {
        console.error("approve error:", e);
        return false;
      }
    },
    [publicClient, userAddress, routerAddress, writeContractAsync],
  );

  const executeExactInput = useCallback(
    async (params: {
      tokenIn: `0x${string}`;
      tokenOut: `0x${string}`;
      pools: PoolInfo[];
      indexPath: number[];
      amountIn: bigint;
      amountOutExpected: bigint;
    }) => {
      if (!userAddress) return;
      const amountOutMinimum = params.amountOutExpected;
      const sqrtPriceLimitX96 = resolveSqrtPriceLimit(
        params.pools,
        params.tokenIn,
      );

      // approve
      const approved = await approveToken(params.tokenIn, params.amountIn);
      if (!approved) return;

      await writeContractAsync({
        address: routerAddress,
        abi: SWAPROUTER_ABI,
        functionName: "exactInput",
        args: [
          {
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            indexPath: params.indexPath as unknown as readonly number[],
            recipient: userAddress,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
            amountIn: params.amountIn,
            amountOutMinimum,
            sqrtPriceLimitX96,
          },
        ],
      });
    },
    [userAddress, routerAddress, approveToken, writeContractAsync],
  );

  const executeExactOutput = useCallback(
    async (params: {
      tokenIn: `0x${string}`;
      tokenOut: `0x${string}`;
      pools: PoolInfo[];
      indexPath: number[];
      amountOut: bigint;
      amountInExpected: bigint;
    }) => {
      if (!userAddress) return;

      const amountInMaximum = params.amountInExpected;
      const sqrtPriceLimitX96 = resolveSqrtPriceLimit(
        params.pools,
        params.tokenIn,
      );

      // approve with max amount
      const approved = await approveToken(params.tokenIn, amountInMaximum);
      if (!approved) return;

      await writeContractAsync({
        address: routerAddress,
        abi: SWAPROUTER_ABI,
        functionName: "exactOutput",
        args: [
          {
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            indexPath: params.indexPath as unknown as readonly number[],
            recipient: userAddress,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
            amountOut: params.amountOut,
            amountInMaximum,
            sqrtPriceLimitX96,
          },
        ],
      });
    },
    [userAddress, routerAddress, approveToken, writeContractAsync],
  );

  return {
    quoteExactInput,
    quoteExactOutput,
    isQuoting,
    quoteError,
    executeExactInput,
    executeExactOutput,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError,
    hash,
    reset,
  };
}
