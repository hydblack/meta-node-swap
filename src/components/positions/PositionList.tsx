"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import DataTable, { Column, PaginationConfig } from "../ui/DataTable";
import {
  ERC20_ABI,
  POSITIONMANAGER_ABI,
} from "@/lib/contracts/abis";
import {
  formatLiquidity,
  formatTickToPrice,
  formatTokenAmount,
  truncateAddr,
} from "@/lib/utils/utils";
import { CONTRACT_ADDRESSES, DEFAULT_PAGE_SIZE } from "@/lib/utils/constant";
import AddPositionModal from "./AddPositionModal";

export interface PositionInfo {
  id: string;
  owner?: string;
  token0: string;
  token1: string;
  token0Symbol?: string;
  token1Symbol?: string;
  index: number;
  fee: number;
  liquidity: string;
  priceLower: string;
  priceUpper: string;
  tokensOwed0: string;
  tokensOwed1: string;
}

export default function PositionList() {
  const { isConnected } = useAccount();
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const {
    data,
    isLoading,
    refetch: refetchPositions,
  } = useReadContracts({
    contracts: [
      {
        abi: POSITIONMANAGER_ABI,
        address: CONTRACT_ADDRESSES.PositionManager,
        functionName: "getAllPositions",
      },
    ],
  });

  const rawPositions = useMemo(() => {
    if (!Array.isArray(data) || data[0]?.status !== "success") return null;
    return data[0].result as any[];
  }, [data]);
  console.log("getAllPositions----------", rawPositions);

  const tokenAddresses = useMemo(() => {
    if (!rawPositions) return [];
    const set = new Set<string>();
    for (const pos of rawPositions) {
      set.add(pos.token0);
      set.add(pos.token1);
    }
    return Array.from(set) as `0x${string}`[];
  }, [rawPositions]);

  const symbolResults = useReadContracts({
    contracts: tokenAddresses.map((addr) => ({
      address: addr,
      abi: ERC20_ABI,
      functionName: "symbol",
    })),
    query: { enabled: tokenAddresses.length > 0 },
  });

  const decimalsResults = useReadContracts({
    contracts: tokenAddresses.map((addr) => ({
      address: addr,
      abi: ERC20_ABI,
      functionName: "decimals",
    })),
    query: { enabled: tokenAddresses.length > 0 },
  });

  const symbolMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!Array.isArray(symbolResults.data)) return map;
    for (let i = 0; i < tokenAddresses.length; i++) {
      const result = symbolResults.data[i];
      if (result.status === "success" && typeof result.result === "string") {
        map.set(tokenAddresses[i].toLowerCase(), result.result);
      }
    }
    return map;
  }, [symbolResults.data, tokenAddresses]);

  const decimalsMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!Array.isArray(decimalsResults.data)) return map;
    for (let i = 0; i < tokenAddresses.length; i++) {
      const result = decimalsResults.data[i];
      if (result.status === "success" && typeof result.result === "number") {
        map.set(tokenAddresses[i].toLowerCase(), result.result);
      }
    }
    return map;
  }, [decimalsResults.data, tokenAddresses]);

  useEffect(() => {
    let formatted: PositionInfo[] = [];
    if (rawPositions && Array.isArray(rawPositions)) {
      formatted = rawPositions.map((pos: any) => {
        const token0Decimals = decimalsMap.get(pos.token0.toLowerCase()) ?? 18;
        const token1Decimals = decimalsMap.get(pos.token1.toLowerCase()) ?? 18;

        return {
          id: String(pos.id),
          owner: pos.owner,
          token0: pos.token0,
          token1: pos.token1,
          token0Symbol: symbolMap.get(pos.token0.toLowerCase()),
          token1Symbol: symbolMap.get(pos.token1.toLowerCase()),
          index: Number(pos.index),
          fee: Number(pos.fee),
          liquidity: formatLiquidity(BigInt(pos.liquidity)),
          priceLower: formatTickToPrice(pos.tickLower),
          priceUpper: formatTickToPrice(pos.tickUpper),
          tokensOwed0: formatTokenAmount(
            BigInt(pos.tokensOwed0),
            token0Decimals,
          ),
          tokensOwed1: formatTokenAmount(
            BigInt(pos.tokensOwed1),
            token1Decimals,
          ),
        };
      });
    }
    setPositions(formatted);
    setCurrentPage(1);
  }, [rawPositions, symbolMap, decimalsMap]);

  const safeCurrentPage = useMemo(() => {
    if (positions.length === 0) return 1;
    const maxPage = Math.max(1, Math.ceil(positions.length / pageSize));
    return Math.min(currentPage, maxPage);
  }, [positions.length, currentPage, pageSize]);

  const pagedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return positions.slice(start, start + pageSize);
  }, [positions, safeCurrentPage, pageSize]);

  const paginationConfig: PaginationConfig | undefined = useMemo(
    () =>
      positions.length > 0
        ? {
            page: safeCurrentPage,
            pageSize,
            total: positions.length,
            pageSizeOptions: [10, 20, 50],
            onPageChange: setCurrentPage,
            onPageSizeChange: (size: number) => {
              setPageSize(size);
              setCurrentPage(1);
            },
          }
        : undefined,
    [positions.length, safeCurrentPage, pageSize],
  );

  const columns: Column<PositionInfo>[] = [
    {
      header: "#",
      render: (row) => (
        <span className="font-mono text-xs opacity-60">#{row.id}</span>
      ),
      cellClassName: "text-center",
      headerClassName: "text-center",
    },
    {
      header: "Token Pair",
      render: (row) => (
        <div>
          <span className="font-medium text-sm whitespace-nowrap">
            {row.token0Symbol ?? truncateAddr(row.token0)}
            {" / "}
            {row.token1Symbol ?? truncateAddr(row.token1)}
          </span>
          <br />
          <span className="text-xs opacity-50 font-mono">
            {truncateAddr(row.token0)} / {truncateAddr(row.token1)}
          </span>
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
      header: "Liquidity",
      render: (row) => (
        <span className="font-mono text-sm tabular-nums">{row.liquidity}</span>
      ),
      cellClassName: "text-right tabular-nums",
      headerClassName: "text-right",
    },
    {
      header: "Tokens Owed",
      render: (row) => (
        <div className="text-right text-sm space-y-0.5">
          <div>
            <span className="tabular-nums">{row.tokensOwed0}</span>{" "}
            <span className="opacity-60 text-xs">
              {row.token0Symbol ?? truncateAddr(row.token0)}
            </span>
          </div>
          <div>
            <span className="tabular-nums">{row.tokensOwed1}</span>{" "}
            <span className="opacity-60 text-xs">
              {row.token1Symbol ?? truncateAddr(row.token1)}
            </span>
          </div>
        </div>
      ),
      cellClassName: "text-right",
      headerClassName: "text-right",
    },
    {
      header: "Owner",
      render: (row) => (
        <span className="font-mono text-xs opacity-60">
          {row.owner ? truncateAddr(row.owner) : "—"}
        </span>
      ),
      cellClassName: "text-center",
      headerClassName: "text-center",
    },
    {
      header: "Actions",
      render: () => (
        <div className="flex gap-1 justify-center">
          <button className="btn btn-xs btn-ghost btn-secondary">
            Collect
          </button>
          <button className="btn btn-xs btn-ghost btn-error">Remove</button>
        </div>
      ),
      cellClassName: "text-center",
      headerClassName: "text-center",
    },
  ];

  if (!isConnected) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <DataTable<PositionInfo>
          data={[]}
          columns={[]}
          emptyRender={() => (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="text-4xl">💧</div>
              <h3 className="text-lg font-semibold">No wallet connected</h3>
              <p className="opacity-60 text-sm text-center max-w-xs">
                Connect your wallet to view and manage your liquidity positions.
              </p>
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">My Positions</h2>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => refetchPositions()}
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
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={() => setAddModalOpen(true)}
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
            New Position
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable<PositionInfo>
        data={pagedData}
        columns={columns}
        loading={isLoading}
        skeletonRows={5}
        emptyText="No data"
        pagination={paginationConfig}
        emptyRender={
          !isLoading && positions.length === 0
            ? () => (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="text-4xl">📊</div>
                  <h3 className="text-lg font-semibold">No open positions</h3>
                  <p className="opacity-60 text-sm text-center max-w-xs">
                    You don&apos;t have any liquidity positions yet. Add
                    liquidity to earn fees.
                  </p>
                  <button
                    className="btn btn-primary btn-sm mt-2"
                    onClick={() => setAddModalOpen(true)}
                  >
                    + New Position
                  </button>
                </div>
              )
            : undefined
        }
      />

      {/* Add Position Modal */}
      <AddPositionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          setAddModalOpen(false);
          refetchPositions();
        }}
      />
    </div>
  );
}
