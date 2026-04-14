'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { ERC20_ABI } from '../contracts/abis';

/**
 * 从一组包含 token0 / token1 字段的 raw 条目中提取去重地址，
 * 批量查询每个代币的 symbol 和 decimals，并返回两张 Map。
 *
 * @param rawItems - 任意包含 token0 / token1（地址字符串）字段的数组，
 *                   为 null / undefined 时视为空列表。
 * @returns
 *   - symbolMap:   address (lowercase) → symbol string
 *   - decimalsMap: address (lowercase) → decimals number
 *   - isLoading:   symbol 或 decimals 请求任意一个仍在加载中
 */
export function useTokenMeta(
  rawItems: Array<{ token0: string; token1: string }> | null | undefined
) {
  // 1. 去重并收集所有代币地址
  const tokenAddresses = useMemo<`0x${string}`[]>(() => {
    if (!rawItems || rawItems.length === 0) return [];
    const set = new Set<string>();
    for (const item of rawItems) {
      if (item.token0) set.add(item.token0);
      if (item.token1) set.add(item.token1);
    }
    return Array.from(set) as `0x${string}`[];
  }, [rawItems]);

  const enabled = tokenAddresses.length > 0;

  // 2. 批量查询 symbol
  const { data: symbolData, isLoading: isSymbolLoading } = useReadContracts({
    contracts: tokenAddresses.map((addr) => ({
      address: addr,
      abi: ERC20_ABI,
      functionName: 'symbol' as const,
    })),
    query: { enabled },
  });

  // 3. 批量查询 decimals
  const { data: decimalsData, isLoading: isDecimalsLoading } = useReadContracts({
    contracts: tokenAddresses.map((addr) => ({
      address: addr,
      abi: ERC20_ABI,
      functionName: 'decimals' as const,
    })),
    query: { enabled },
  });

  // 4. 构建 symbolMap
  const symbolMap = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    if (!Array.isArray(symbolData)) return map;
    for (let i = 0; i < tokenAddresses.length; i++) {
      const result = symbolData[i];
      if (result?.status === 'success' && typeof result.result === 'string') {
        map.set(tokenAddresses[i].toLowerCase(), result.result);
      }
    }
    return map;
  }, [symbolData, tokenAddresses]);

  // 5. 构建 decimalsMap
  const decimalsMap = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (!Array.isArray(decimalsData)) return map;
    for (let i = 0; i < tokenAddresses.length; i++) {
      const result = decimalsData[i];
      if (result?.status === 'success' && typeof result.result === 'number') {
        map.set(tokenAddresses[i].toLowerCase(), result.result);
      }
    }
    return map;
  }, [decimalsData, tokenAddresses]);

  return {
    symbolMap,
    decimalsMap,
    tokenAddresses,
    isLoading: isSymbolLoading || isDecimalsLoading,
  };
}
