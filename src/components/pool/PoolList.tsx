"use client";

import { useEffect, useMemo, useState } from "react";
import { useReadContracts } from "wagmi";
import { POOLMANAGER_ABI } from "@/lib/contracts/abis";
import DataTable, { Column, PaginationConfig } from "../ui/DataTable";
import AddPoolModal from "./AddPoolModal";
import {
  formatLiquidity,
  formatSqrtPriceX96,
  formatTickToPrice,
  formatTokenAmount,
  truncateAddr,
} from "@/lib/utils/utils";
import { CONTRACT_ADDRESSES, DEFAULT_PAGE_SIZE, Q96 } from "@/lib/utils/constant";
import { useTokenMeta } from "@/lib/hooks";

export interface PoolInfo {
  index: number;
  token0: string;
  token1: string;
  token0Symbol?: string;
  token1Symbol?: string;
  liquidity: string;
  priceLower: string;
  priceUpper: string;
  fee: number;
  sqrtPriceX96: string;
  amount0: string;
  amount1: string;
}

export default function PoolList() {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    data,
    isLoading,
    refetch: refetchPools,
  } = useReadContracts({
    contracts: [
      {
        abi: POOLMANAGER_ABI,
        address: CONTRACT_ADDRESSES.PoolManager,
        functionName: "getAllPools",
      },
    ],
  });

  const rawPools = useMemo(() => {
    if (!Array.isArray(data) || data[0]?.status !== "success") return null;
    return data[0].result as any[];
  }, [data]);
  console.log("getAllPools----------------", rawPools);

  const { symbolMap, decimalsMap } = useTokenMeta(rawPools);

  useEffect(() => {
    let formattedPools: PoolInfo[] = [];
    if (rawPools && Array.isArray(rawPools)) {
      formattedPools = rawPools.map((pool: any) => {
        const liquidity = BigInt(pool.liquidity);
        const sqrtPriceX96 = BigInt(pool.sqrtPriceX96);
        let amount0 = 0n;
        let amount1 = 0n;
        if (sqrtPriceX96 !== 0n) {
          amount0 = (liquidity * Q96) / sqrtPriceX96;
          amount1 = (liquidity * sqrtPriceX96) / Q96;
        }
        const token0Decimals = decimalsMap.get(pool.token0.toLowerCase()) ?? 18;
        const token1Decimals = decimalsMap.get(pool.token1.toLowerCase()) ?? 18;

        return {
          index: pool.index,
          token0: pool.token0,
          token1: pool.token1,
          token0Symbol: symbolMap.get(pool.token0.toLowerCase()),
          token1Symbol: symbolMap.get(pool.token1.toLowerCase()),
          liquidity: formatLiquidity(pool.liquidity),
          priceLower: formatTickToPrice(pool.tickLower),
          priceUpper: formatTickToPrice(pool.tickUpper),
          fee: Number(pool.fee),
          sqrtPriceX96: pool.sqrtPriceX96
            ? formatSqrtPriceX96(pool.sqrtPriceX96)
            : "0",
          amount0: formatTokenAmount(amount0, token0Decimals),
          amount1: formatTokenAmount(amount1, token1Decimals),
        };
      });
    }
    setPools(formattedPools);
    setCurrentPage(1);
  }, [rawPools, symbolMap, decimalsMap]);

  const safeCurrentPage = useMemo(() => {
    if (pools.length === 0) return 1;
    const maxPage = Math.max(1, Math.ceil(pools.length / pageSize));
    return Math.min(currentPage, maxPage);
  }, [pools.length, currentPage, pageSize]);

  const pagedPools = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return pools.slice(start, start + pageSize);
  }, [pools, safeCurrentPage, pageSize]);

  const paginationConfig: PaginationConfig | undefined = useMemo(
    () =>
      pools.length > 0
        ? {
            page: safeCurrentPage,
            pageSize,
            total: pools.length,
            pageSizeOptions: [10, 20, 50],
            onPageChange: setCurrentPage,
            onPageSizeChange: (size: number) => {
              setPageSize(size);
              setCurrentPage(1);
            },
          }
        : undefined,
    [pools.length, safeCurrentPage, pageSize],
  );

  const columns: Column<PoolInfo>[] = [
    {
      header: "Token",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div>
            <span className="font-medium text-sm whitespace-nowrap">
              {row.token0Symbol ?? truncateAddr(row.token0)}（{row.amount0}）
              {" / "}
              {row.token1Symbol ?? truncateAddr(row.token1)}（{row.amount1}）
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Fee Tier",
      render: (row) => (
        <span className="badge badge-outline badge-primary badge-sm font-mono">
          {(row.fee / 10000).toFixed(2)}%
        </span>
      ),
      cellClassName: "text-center",
      headerClassName: "text-center",
    },
    {
      header: "Price Range",
      render: (row) => (
        <span className="font-mono text-xs opacity-80">
          {row.priceLower} – {row.priceUpper}
        </span>
      ),
      cellClassName: "text-center font-mono text-xs",
      headerClassName: "text-center",
    },
    {
      header: "Current Price",
      render: (row) => (
        <span className="font-mono text-sm tabular-nums">
          {row.sqrtPriceX96}
        </span>
      ),
      cellClassName: "text-right tabular-nums",
      headerClassName: "text-right",
    },
    {
      header: "Liquidity",
      render: (row) => (
        <span className="font-mono text-sm tabular-nums">{row.liquidity}</span>
      ),
      cellClassName: "text-right tabular-nums",
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Pool List</h2>
        <button
          className="btn btn-primary btn-sm gap-1"
          onClick={() => setShowAddModal(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Pool
        </button>
      </div>

      {/* Table */}
      <DataTable<PoolInfo>
        data={pagedPools}
        columns={columns}
        loading={isLoading}
        skeletonRows={5}
        emptyText="No data"
        pagination={paginationConfig}
      />

      {/* Add Pool Modal */}
      <AddPoolModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          refetchPools();
        }}
      />
    </div>
  );
}
