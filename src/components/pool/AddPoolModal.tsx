"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAddPool, AddPoolParams } from "@/lib/hooks/useAddPool";
import { FEE_TIERS, TOKEN_LIST } from "@/lib/utils/constant";
import { TickMath } from "@uniswap/v3-sdk";
import {
  formatTickToPrice,
  isAddress,
  priceToSqrtPriceX96,
} from "@/lib/utils/utils";

const TOKEN_OPTIONS = TOKEN_LIST ?? [];

interface FormState {
  token0: string;
  token1: string;
  fee: number;
  currentPrice: string;
  priceLower: string;
  priceUpper: string;
}

interface AddPoolModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddPoolModal({
  open,
  onClose,
  onSuccess,
}: AddPoolModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [form, setForm] = useState<FormState>({
    token0: TOKEN_OPTIONS[0]?.address ?? "",
    token1: TOKEN_OPTIONS[1]?.address ?? "",
    fee: 3000,
    currentPrice: "1",
    priceLower: "0.5",
    priceUpper: "2",
  });

  const { addPool, isPending, isConfirming, isSuccess, error, reset } =
    useAddPool();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (isSuccess) {
      onSuccess?.();
      setTimeout(() => {
        handleClose();
      }, 1500);
    }
  }, [isSuccess]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    reset();
    setForm({
      token0: TOKEN_OPTIONS[0]?.address ?? "",
      token1: TOKEN_OPTIONS[1]?.address ?? "",
      fee: 3000,
      currentPrice: "1",
      priceLower: "0.5",
      priceUpper: "2",
    });
    onClose();
  };

  const { tickLower, tickUpper, sqrtPriceX96, validationError } =
    useMemo(() => {
      const currentPriceNum = parseFloat(form.currentPrice);
      const priceLowerNum = parseFloat(form.priceLower);
      const priceUpperNum = parseFloat(form.priceUpper);

      if (form.token0 === form.token1)
        return {
          tickLower: 0,
          tickUpper: 0,
          sqrtPriceX96: 0n,
          validationError: "Token0 and Token1 cannot be the same",
        };

      if (!isAddress(form.token0))
        return {
          tickLower: 0,
          tickUpper: 0,
          sqrtPriceX96: 0n,
          validationError: "Invalid Token0 address format",
        };

      if (!isAddress(form.token1))
        return {
          tickLower: 0,
          tickUpper: 0,
          sqrtPriceX96: 0n,
          validationError: "Invalid Token1 address format",
        };

      if (isNaN(currentPriceNum) || currentPriceNum <= 0)
        return {
          tickLower: 0,
          tickUpper: 0,
          sqrtPriceX96: 0n,
          validationError: "Initial price must be greater than 0",
        };

      if (isNaN(priceLowerNum) || priceLowerNum <= 0)
        return {
          tickLower: 0,
          tickUpper: 0,
          sqrtPriceX96: 0n,
          validationError: "Lower price must be greater than 0",
        };

      if (isNaN(priceUpperNum) || priceUpperNum <= 0)
        return {
          tickLower: 0,
          tickUpper: 0,
          sqrtPriceX96: 0n,
          validationError: "Upper price must be greater than 0",
        };

      if (priceLowerNum >= priceUpperNum)
        return {
          tickLower: 0,
          tickUpper: 0,
          sqrtPriceX96: 0n,
          validationError: "Upper price must be greater than lower price",
        };

      if (currentPriceNum < priceLowerNum || currentPriceNum > priceUpperNum)
        return {
          tickLower: 0,
          tickUpper: 0,
          sqrtPriceX96: 0n,
          validationError:
            "Initial price must be within [lower, upper] price range",
        };

      const tlSqrtPx96 = priceToSqrtPriceX96(priceLowerNum);
      const tl = TickMath.getTickAtSqrtRatio(tlSqrtPx96);
      const tuSqrtPx96 = priceToSqrtPriceX96(priceUpperNum);
      const tu = TickMath.getTickAtSqrtRatio(tuSqrtPx96);
      const sqrtPx96 = priceToSqrtPriceX96(currentPriceNum);

      if (tl >= tu)
        return {
          tickLower: tl,
          tickUpper: tu,
          sqrtPriceX96: sqrtPx96,
          validationError:
            "Price range too narrow, resulting tick values are identical. Please widen the range.",
        };

      return {
        tickLower: tl,
        tickUpper: tu,
        sqrtPriceX96: sqrtPx96 as any,
        validationError: null,
      };
    }, [form]);

  const canSubmit =
    !validationError && !isPending && !isConfirming && !isSuccess;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const params = {
      token0: form.token0 as `0x${string}`,
      token1: form.token1 as `0x${string}`,
      fee: form.fee,
      tickLower,
      tickUpper,
      sqrtPriceX96,
    };
    addPool(params as AddPoolParams);
  };

  const TokenSelect = ({
    label,
    value,
    onChange,
    excludeAddr,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    excludeAddr?: string;
  }) => (
    <div className="form-control w-full">
      <label className="label py-1">
        <span className="label-text font-medium text-xs">{label}</span>
      </label>
      <select
        className="select select-bordered select-sm w-full font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {TOKEN_OPTIONS.filter((t) => t.address !== excludeAddr).map((t) => (
          <option key={t.address} value={t.address}>
            {t.symbol} — {t.address.slice(0, 8)}…{t.address.slice(-6)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <dialog ref={dialogRef} className="modal" onClose={handleClose}>
      <div className="modal-box w-full max-w-lg">
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Add Pool</h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={handleClose}
            disabled={isPending || isConfirming}
          >
            ✕
          </button>
        </div>

        {/* Success State */}
        {isSuccess ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="text-5xl">✅</div>
            <p className="font-semibold text-success">
              Pool created successfully!
            </p>
            <p className="text-xs opacity-60 font-mono break-all text-center">
              Tx: {/* hash */}
            </p>
          </div>
        ) : (
          <>
            {/* Token Selection */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <TokenSelect
                label="Token 0"
                value={form.token0}
                onChange={(v) => set("token0", v)}
                excludeAddr={form.token1}
              />
              <TokenSelect
                label="Token 1"
                value={form.token1}
                onChange={(v) => set("token1", v)}
                excludeAddr={form.token0}
              />
            </div>

            {/* Fee Tier */}
            <div className="form-control w-full mb-4">
              <label className="label py-1">
                <span className="label-text font-medium text-xs">Fee Tier</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {FEE_TIERS.map((tier) => (
                  <button
                    key={tier.value}
                    type="button"
                    className={`btn btn-sm flex-1 ${
                      form.fee === tier.value
                        ? "btn-primary"
                        : "btn-outline btn-primary"
                    }`}
                    onClick={() => set("fee", tier.value)}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Settings */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-medium">
                    Initial Price
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="input input-bordered input-sm font-mono text-xs"
                  value={form.currentPrice}
                  onChange={(e) => set("currentPrice", e.target.value)}
                  placeholder="1.0"
                />
              </div>
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-medium">
                    Lower Price
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="input input-bordered input-sm font-mono text-xs"
                  value={form.priceLower}
                  onChange={(e) => set("priceLower", e.target.value)}
                  placeholder="0.5"
                />
              </div>
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-medium">
                    Upper Price
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="input input-bordered input-sm font-mono text-xs"
                  value={form.priceUpper}
                  onChange={(e) => set("priceUpper", e.target.value)}
                  placeholder="2.0"
                />
              </div>
            </div>

            {/* Derived Information Display */}
            {!validationError && (
              <div className="bg-base-200 rounded-lg p-3 mb-4 space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="opacity-60">Tick Lower</span>
                  <span className="font-semibold">{tickLower}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Tick Upper</span>
                  <span className="font-semibold">{tickUpper}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">sqrtPriceX96</span>
                  <span className="font-semibold truncate max-w-45">
                    {sqrtPriceX96.toString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Price Lower</span>
                  <span className="font-semibold">
                    {formatTickToPrice(tickLower)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Price Upper</span>
                  <span className="font-semibold">
                    {formatTickToPrice(tickUpper)}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {validationError && (
              <div className="alert alert-warning alert-sm py-2 mb-4 text-xs">
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
                <span>{validationError}</span>
              </div>
            )}

            {/* Contract Error */}
            {error && (
              <div className="alert alert-error alert-sm py-2 mb-4 text-xs">
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
                  {(error as any)?.shortMessage ??
                    error?.message ??
                    "Transaction Failed"}
                </span>
              </div>
            )}

            {/* Operation Buttons */}
            <div className="modal-action mt-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClose}
                disabled={isPending || isConfirming}
              >
                Cancel
              </button>
              <button
                className={`btn btn-primary btn-sm min-w-30 ${
                  isPending || isConfirming ? "loading" : ""
                }`}
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {isPending
                  ? "Confirming…"
                  : isConfirming
                    ? "Waiting for blockchain confirmation…"
                    : "Create Pool"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Background Overlay Click to Close */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
}
