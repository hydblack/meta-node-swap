"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import DataTable, { Column, PaginationConfig } from "../ui/DataTable";
import { POSITIONMANAGER_ABI } from "@/lib/contracts/abis";
import {
  formatLiquidity,
  formatTickToPrice,
  formatTokenAmount,
  truncateAddr,
} from "@/lib/utils/utils";
import { CONTRACT_ADDRESSES, DEFAULT_PAGE_SIZE } from "@/lib/utils/constant";
import AddPositionModal from "./AddPositionModal";
import { useCollectPosition, useBurnPosition, useTokenMeta } from "@/lib/hooks";

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

interface CollectModalProps {
  position: PositionInfo | null;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
}

function CollectModal({
  position,
  onConfirm,
  onClose,
  isPending,
  isConfirming,
  isSuccess,
  error,
}: CollectModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (position) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [position]);

  const isLoading = isPending || isConfirming;

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Collect Fees</h3>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="text-success text-4xl">✓</div>
            <p className="text-sm text-center opacity-70">
              Fees collected successfully!
            </p>
            <button className="btn btn-sm btn-primary mt-2" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Position ID</span>
                <span className="font-mono font-medium">#{position?.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Token Pair</span>
                <span className="font-medium">
                  {position?.token0Symbol ??
                    truncateAddr(position?.token0 ?? "")}
                  {" / "}
                  {position?.token1Symbol ??
                    truncateAddr(position?.token1 ?? "")}
                </span>
              </div>
              <div className="divider my-1" />
              <p className="text-sm opacity-60">Tokens owed to be collected:</p>
              <div className="bg-base-200 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">
                    {position?.token0Symbol ??
                      truncateAddr(position?.token0 ?? "")}
                  </span>
                  <span className="font-mono tabular-nums">
                    {position?.tokensOwed0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">
                    {position?.token1Symbol ??
                      truncateAddr(position?.token1 ?? "")}
                  </span>
                  <span className="font-mono tabular-nums">
                    {position?.tokensOwed1}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-error text-xs mb-4 py-2">
                <span className="break-all">{error.message}</span>
              </div>
            )}

            <div className="modal-action mt-0">
              <button
                className="btn btn-ghost btn-sm"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-secondary btn-sm gap-1"
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                {isPending
                  ? "Confirm in wallet..."
                  : isConfirming
                    ? "Confirming..."
                    : "Collect"}
              </button>
            </div>
          </>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose} />
      </form>
    </dialog>
  );
}

interface RemoveModalProps {
  position: PositionInfo | null;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
}

function RemoveModal({
  position,
  onConfirm,
  onClose,
  isPending,
  isConfirming,
  isSuccess,
  error,
}: RemoveModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (position) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [position]);

  const isLoading = isPending || isConfirming;

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-1">Remove Position</h3>
        <p className="text-sm opacity-60 mb-4">
          This will remove all liquidity and burn the position NFT. This action
          cannot be undone.
        </p>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="text-success text-4xl">✓</div>
            <p className="text-sm text-center opacity-70">
              Position removed successfully!
            </p>
            <button className="btn btn-sm btn-primary mt-2" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Position ID</span>
                <span className="font-mono font-medium">#{position?.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Token Pair</span>
                <span className="font-medium">
                  {position?.token0Symbol ??
                    truncateAddr(position?.token0 ?? "")}
                  {" / "}
                  {position?.token1Symbol ??
                    truncateAddr(position?.token1 ?? "")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Liquidity</span>
                <span className="font-mono">{position?.liquidity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Fee Tier</span>
                <span className="badge badge-outline badge-sm font-mono">
                  {position ? (position.fee / 10000).toFixed(2) : "—"}%
                </span>
              </div>

              <div className="alert alert-warning py-2 text-xs">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>
                  All liquidity will be returned to your wallet and the position
                  NFT will be burned.
                </span>
              </div>
            </div>

            {error && (
              <div className="alert alert-error text-xs mb-4 py-2">
                <span className="break-all">{error.message}</span>
              </div>
            )}

            <div className="modal-action mt-0">
              <button
                className="btn btn-ghost btn-sm"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-error btn-sm gap-1"
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                {isPending
                  ? "Confirm in wallet..."
                  : isConfirming
                    ? "Confirming..."
                    : "Remove Position"}
              </button>
            </div>
          </>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose} />
      </form>
    </dialog>
  );
}

export default function PositionList() {
  const { isConnected } = useAccount();
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [collectTarget, setCollectTarget] = useState<PositionInfo | null>(null);
  const [removeTarget, setRemoveTarget] = useState<PositionInfo | null>(null);

  const {
    collect,
    isPending: isCollectPending,
    isConfirming: isCollectConfirming,
    isSuccess: isCollectSuccess,
    error: collectError,
    reset: resetCollect,
  } = useCollectPosition();

  const {
    burn,
    isPending: isBurnPending,
    isConfirming: isBurnConfirming,
    isSuccess: isBurnSuccess,
    error: burnError,
    reset: resetBurn,
  } = useBurnPosition();

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

  const { symbolMap, decimalsMap } = useTokenMeta(rawPositions);

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

  useEffect(() => {
    if (isCollectSuccess) refetchPositions();
  }, [isCollectSuccess, refetchPositions]);

  useEffect(() => {
    if (isBurnSuccess) refetchPositions();
  }, [isBurnSuccess, refetchPositions]);

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
      cellClassName: "text-center w-10",
      headerClassName: "text-center w-10",
    },
    {
      header: "Token Pair",
      render: (row) => (
        <span className="font-medium text-sm whitespace-nowrap">
          {row.token0Symbol ?? truncateAddr(row.token0)}
          {" / "}
          {row.token1Symbol ?? truncateAddr(row.token1)}
        </span>
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
        <div className="text-xs font-mono opacity-80 leading-5">
          <div>{row.priceLower}</div>
          <div className="opacity-50">—</div>
          <div>{row.priceUpper}</div>
        </div>
      ),
      cellClassName: "text-center",
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
        <div className="text-right text-xs font-mono space-y-0.5">
          <div className="tabular-nums">
            {row.tokensOwed0}{" "}
            <span className="opacity-50">
              {row.token0Symbol ?? truncateAddr(row.token0)}
            </span>
          </div>
          <div className="tabular-nums">
            {row.tokensOwed1}{" "}
            <span className="opacity-50">
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
      render: (row) => (
        <div className="flex gap-1 justify-center">
          <button
            className="btn btn-xs btn-outline btn-secondary"
            onClick={() => {
              resetCollect();
              setCollectTarget(row);
            }}
          >
            Collect
          </button>
          <button
            className="btn btn-xs btn-outline btn-error"
            onClick={() => {
              resetBurn();
              setRemoveTarget(row);
            }}
          >
            Remove
          </button>
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

      {/* Collect Modal */}
      <CollectModal
        position={collectTarget}
        isPending={isCollectPending}
        isConfirming={isCollectConfirming}
        isSuccess={isCollectSuccess}
        error={collectError as Error | null}
        onConfirm={() => {
          if (!collectTarget) return;
          collect(BigInt(collectTarget.id));
        }}
        onClose={() => {
          setCollectTarget(null);
          resetCollect();
        }}
      />

      {/* Remove Modal */}
      <RemoveModal
        position={removeTarget}
        isPending={isBurnPending}
        isConfirming={isBurnConfirming}
        isSuccess={isBurnSuccess}
        error={burnError as Error | null}
        onConfirm={() => {
          if (!removeTarget) return;
          burn(BigInt(removeTarget.id));
        }}
        onClose={() => {
          setRemoveTarget(null);
          resetBurn();
        }}
      />
    </div>
  );
}
