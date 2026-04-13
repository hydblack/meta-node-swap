"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import {
  useFilteredPools,
  useMintPosition,
  usePositionTokenApprove,
  RawPoolInfo,
} from "@/lib/hooks/useAddPosition";
import { ERC20_ABI } from "@/lib/contracts/abis";
import { CONTRACT_ADDRESSES, TOKEN_LIST } from "@/lib/utils/constant";
import { truncateAddr } from "@/lib/utils/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─────────────────────────── 辅助：格式化余额 ────────────────────────────
function fmtBalance(raw: bigint, decimals: number): string {
  try {
    const n = Number(formatUnits(raw, decimals));
    if (n === 0) return "0";
    if (n < 0.0001) return "<0.0001";
    return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  } catch {
    return "0";
  }
}

// ─────────────────────────── 辅助：费率显示 ──────────────────────────────
function fmtFee(fee: number): string {
  return (fee / 10000).toFixed(2) + "%";
}

// ─────────────────────────── 组件 ────────────────────────────────────────
export default function AddPositionModal({ open, onClose, onSuccess }: Props) {
  const { address } = useAccount();

  // ---- 选中的 token ----
  const [token0Addr, setToken0Addr] = useState<`0x${string}` | "">("");
  const [token1Addr, setToken1Addr] = useState<`0x${string}` | "">("");

  // ---- token 选项：直接来自 TOKEN_LIST，token1 排除已选的 token0 ----
  const token0Options = TOKEN_LIST;
  const token1Options = useMemo(
    () =>
      TOKEN_LIST.filter(
        (t) => t.address.toLowerCase() !== token0Addr.toLowerCase(),
      ),
    [token0Addr],
  );

  // token0 变化时清空 token1
  useEffect(() => {
    setToken1Addr("");
    setSelectedPool(null);
    setAmount0("");
    setAmount1("");
  }, [token0Addr]);

  useEffect(() => {
    setSelectedPool(null);
    setAmount0("");
    setAmount1("");
  }, [token1Addr]);

  // ---- 根据 token pair 过滤出可用的池 ----
  const { filteredPools, isLoading: poolsLoading } = useFilteredPools(
    token0Addr || undefined,
    token1Addr || undefined,
  );

  // ---- 选中的池（费率 + index）----
  const [selectedPool, setSelectedPool] = useState<RawPoolInfo | null>(null);

  // 只有一个池时自动选中
  useEffect(() => {
    if (filteredPools.length === 1) {
      setSelectedPool(filteredPools[0]);
    } else if (filteredPools.length === 0) {
      setSelectedPool(null);
    }
  }, [filteredPools]);

  // ---- 查询 TOKEN_LIST 中的 meta ----
  const resolveToken = (addr: string) =>
    TOKEN_LIST.find((t) => t.address.toLowerCase() === addr.toLowerCase());

  const token0Meta = token0Addr ? resolveToken(token0Addr) : undefined;
  const token1Meta = token1Addr ? resolveToken(token1Addr) : undefined;

  const decimals0 = token0Meta?.decimals ?? 18;
  const decimals1 = token1Meta?.decimals ?? 18;

  // ---- 批量查询余额 ----
  const balanceContracts = useMemo(() => {
    if (!address) return [];
    const list: any[] = [];
    if (token0Addr)
      list.push({
        address: token0Addr,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      });
    if (token1Addr)
      list.push({
        address: token1Addr,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      });
    return list;
  }, [address, token0Addr, token1Addr]);

  const { data: balanceData } = useReadContracts({
    contracts: balanceContracts,
    query: { enabled: balanceContracts.length > 0 },
  });

  const balance0 = useMemo<bigint>(() => {
    if (!token0Addr || !balanceData?.[0] || balanceData[0].status !== "success")
      return 0n;
    return balanceData[0].result as bigint;
  }, [token0Addr, balanceData]);

  const balance1 = useMemo<bigint>(() => {
    if (!token1Addr || !balanceData) return 0n;
    const idx = token0Addr ? 1 : 0;
    if (!balanceData[idx] || balanceData[idx].status !== "success") return 0n;
    return balanceData[idx].result as bigint;
  }, [token0Addr, token1Addr, balanceData]);

  // ---- 批量查询 allowance ----
  const allowanceContracts = useMemo(() => {
    if (!address) return [];
    const spender = CONTRACT_ADDRESSES.PositionManager;
    const list: any[] = [];
    if (token0Addr)
      list.push({
        address: token0Addr,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, spender],
      });
    if (token1Addr)
      list.push({
        address: token1Addr,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, spender],
      });
    return list;
  }, [address, token0Addr, token1Addr]);

  const { data: allowanceData, refetch: refetchAllowance } = useReadContracts({
    contracts: allowanceContracts,
    query: { enabled: allowanceContracts.length > 0 },
  });

  const allowance0 = useMemo<bigint>(() => {
    if (
      !token0Addr ||
      !allowanceData?.[0] ||
      allowanceData[0].status !== "success"
    )
      return 0n;
    return allowanceData[0].result as bigint;
  }, [token0Addr, allowanceData]);

  const allowance1 = useMemo<bigint>(() => {
    if (!token1Addr || !allowanceData) return 0n;
    const idx = token0Addr ? 1 : 0;
    if (!allowanceData[idx] || allowanceData[idx].status !== "success")
      return 0n;
    return allowanceData[idx].result as bigint;
  }, [token0Addr, token1Addr, allowanceData]);

  // ---- 输入金额 ----
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");

  // ---- approve hooks ----
  const {
    approve: approveToken,
    isPending: isApprovePending,
    isConfirming: isApproveConfirming,
    isSuccess: isApproveSuccess,
    reset: resetApprove,
  } = usePositionTokenApprove();

  // approve 成功后刷新 allowance
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      resetApprove();
    }
  }, [isApproveSuccess]); // eslint-disable-line

  // ---- mint hook ----
  const {
    mint,
    isPending: isMintPending,
    isConfirming: isMintConfirming,
    isSuccess: isMintSuccess,
    error: mintError,
    reset: resetMint,
  } = useMintPosition();

  // mint 成功后关闭弹窗
  useEffect(() => {
    if (isMintSuccess) {
      onSuccess?.();
      handleClose();
    }
  }, [isMintSuccess]); // eslint-disable-line

  // ---- 判断是否需要 approve ----
  const parsedAmount0 = useMemo<bigint>(() => {
    if (!amount0 || !token0Addr) return 0n;
    try {
      return BigInt(Math.floor(parseFloat(amount0) * Math.pow(10, decimals0)));
    } catch {
      return 0n;
    }
  }, [amount0, token0Addr, decimals0]);

  const parsedAmount1 = useMemo<bigint>(() => {
    if (!amount1 || !token1Addr) return 0n;
    try {
      return BigInt(Math.floor(parseFloat(amount1) * Math.pow(10, decimals1)));
    } catch {
      return 0n;
    }
  }, [amount1, token1Addr, decimals1]);

  const needApprove0 = parsedAmount0 > 0n && allowance0 < parsedAmount0;
  const needApprove1 = parsedAmount1 > 0n && allowance1 < parsedAmount1;

  // ---- 表单校验 ----
  const canSubmit = useMemo(() => {
    return (
      !!token0Addr &&
      !!token1Addr &&
      !!selectedPool &&
      parsedAmount0 > 0n &&
      parsedAmount1 > 0n &&
      !needApprove0 &&
      !needApprove1 &&
      !isMintPending &&
      !isMintConfirming
    );
  }, [
    token0Addr,
    token1Addr,
    selectedPool,
    parsedAmount0,
    parsedAmount1,
    needApprove0,
    needApprove1,
    isMintPending,
    isMintConfirming,
  ]);

  // ---- 操作 ----
  const handleApprove0 = () => {
    if (!token0Addr) return;
    approveToken(token0Addr as `0x${string}`, parsedAmount0 * 2n); // approve 2x 减少后续操作
  };

  const handleApprove1 = () => {
    if (!token1Addr) return;
    approveToken(token1Addr as `0x${string}`, parsedAmount1 * 2n);
  };

  const handleMint = () => {
    if (!selectedPool || !address || !token0Addr || !token1Addr) return;
    mint({
      token0: selectedPool.token0,
      token1: selectedPool.token1,
      index: selectedPool.index,
      amount0Desired: amount0,
      amount1Desired: amount1,
      decimals0,
      decimals1,
      recipient: address,
    });
  };

  const handleClose = () => {
    setToken0Addr("");
    setToken1Addr("");
    setSelectedPool(null);
    setAmount0("");
    setAmount1("");
    resetMint();
    resetApprove();
    onClose();
  };

  if (!open) return null;

  const isApproving = isApprovePending || isApproveConfirming;
  const isMinting = isMintPending || isMintConfirming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-base-100 rounded-2xl shadow-2xl border border-base-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
          <h3 className="text-lg font-bold">Add Position</h3>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={handleClose}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* ── Token 选择区 ── */}
          <div className="space-y-3">
            <p className="text-sm font-semibold opacity-70 uppercase tracking-wide">
              Select Token Pair
            </p>

            {/* Token 0 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs opacity-60">Token 0</label>
                {token0Addr && (
                  <span className="text-xs opacity-50">
                    Balance: {fmtBalance(balance0, decimals0)}{" "}
                    {token0Meta?.symbol ?? truncateAddr(token0Addr)}
                  </span>
                )}
              </div>
              <select
                className="select select-bordered select-sm w-full"
                value={token0Addr}
                onChange={(e) => setToken0Addr(e.target.value as `0x${string}`)}
              >
                <option value="">Select token</option>
                {token0Options.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol} — {token.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Token 1 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs opacity-60">Token 1</label>
                {token1Addr && (
                  <span className="text-xs opacity-50">
                    Balance: {fmtBalance(balance1, decimals1)}{" "}
                    {token1Meta?.symbol ?? truncateAddr(token1Addr)}
                  </span>
                )}
              </div>
              <select
                className="select select-bordered select-sm w-full"
                value={token1Addr}
                onChange={(e) => setToken1Addr(e.target.value as `0x${string}`)}
                disabled={!token0Addr}
              >
                <option value="">
                  {!token0Addr ? "Select token 0 first" : "Select token"}
                </option>
                {token1Options.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol} — {token.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── 费率 / 池选择 ── */}
          {token0Addr && token1Addr && (
            <div className="space-y-2">
              <p className="text-sm font-semibold opacity-70 uppercase tracking-wide">
                Fee Tier
              </p>

              {poolsLoading ? (
                <div className="flex items-center gap-2 text-sm opacity-60">
                  <span className="loading loading-spinner loading-xs" />
                  Loading pools…
                </div>
              ) : filteredPools.length === 0 ? (
                <div className="text-sm text-warning opacity-80">
                  No pools found for this pair.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredPools.map((pool) => {
                    const isSelected = selectedPool?.pool === pool.pool;
                    return (
                      <button
                        key={pool.pool}
                        onClick={() => setSelectedPool(pool)}
                        className={`btn btn-sm rounded-full border transition-all ${
                          isSelected
                            ? "btn-primary"
                            : "btn-outline opacity-70 hover:opacity-100"
                        }`}
                      >
                        {fmtFee(pool.fee)}
                        <span className="ml-1 text-xs opacity-70">
                          #{pool.index}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 输入数量 ── */}
          {selectedPool && (
            <div className="space-y-3">
              <p className="text-sm font-semibold opacity-70 uppercase tracking-wide">
                Deposit Amounts
              </p>

              {/* Amount 0 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs opacity-60">
                    {token0Meta?.symbol ?? truncateAddr(token0Addr)} Amount
                  </label>
                  <button
                    className="text-xs text-primary hover:underline cursor-pointer"
                    onClick={() =>
                      setAmount0(
                        fmtBalance(balance0, decimals0).replace(/,/g, ""),
                      )
                    }
                  >
                    Max
                  </button>
                </div>
                <label className="input input-bordered input-sm flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.0"
                    className="grow"
                    value={amount0}
                    onChange={(e) => setAmount0(e.target.value)}
                  />
                  <span className="opacity-60 text-xs shrink-0">
                    {token0Meta?.symbol ?? truncateAddr(token0Addr)}
                  </span>
                </label>
                {/* Approve 0 */}
                {needApprove0 && (
                  <button
                    className="btn btn-warning btn-xs w-full mt-1"
                    onClick={handleApprove0}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : null}
                    Approve {token0Meta?.symbol}
                  </button>
                )}
              </div>

              {/* Amount 1 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs opacity-60">
                    {token1Meta?.symbol ?? truncateAddr(token1Addr)} Amount
                  </label>
                  <button
                    className="text-xs text-primary hover:underline cursor-pointer"
                    onClick={() =>
                      setAmount1(
                        fmtBalance(balance1, decimals1).replace(/,/g, ""),
                      )
                    }
                  >
                    Max
                  </button>
                </div>
                <label className="input input-bordered input-sm flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.0"
                    className="grow"
                    value={amount1}
                    onChange={(e) => setAmount1(e.target.value)}
                  />
                  <span className="opacity-60 text-xs shrink-0">
                    {token1Meta?.symbol ?? truncateAddr(token1Addr)}
                  </span>
                </label>
                {/* Approve 1 */}
                {needApprove1 && (
                  <button
                    className="btn btn-warning btn-xs w-full mt-1"
                    onClick={handleApprove1}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : null}
                    Approve {token1Meta?.symbol}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── 池信息摘要 ── */}
          {selectedPool && (
            <div className="bg-base-200 rounded-xl px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="opacity-60">Fee Rate</span>
                <span className="font-medium">{fmtFee(selectedPool.fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Pool Index</span>
                <span className="font-medium">#{selectedPool.index}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Pool Address</span>
                <span className="font-mono text-xs">
                  {truncateAddr(selectedPool.pool)}
                </span>
              </div>
            </div>
          )}

          {/* ── 错误提示 ── */}
          {mintError && (
            <div className="alert alert-error text-xs py-2">
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
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="break-all">
                {mintError.message?.slice(0, 120)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-1 flex gap-3">
          <button
            className="btn btn-ghost btn-sm flex-1"
            onClick={handleClose}
            disabled={isMinting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm flex-1"
            onClick={handleMint}
            disabled={!canSubmit}
          >
            {isMinting ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                {isMintConfirming ? "Confirming…" : "Submitting…"}
              </>
            ) : (
              "Add Position"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
