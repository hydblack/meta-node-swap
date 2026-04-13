import { encodeSqrtRatioX96, TickMath } from "@uniswap/v3-sdk";
import { formatUnits } from "viem";
import { MAX_TICK, MIN_TICK, Q96 } from "./constant";
import JSBI from "jsbi";

export function priceToSqrtPriceX96(price: number): JSBI{
  if (price <= 0) {
    return JSBI.BigInt(0);
  }
  const numerator = JSBI.BigInt(price * 10 ** 18);
  const denominator = JSBI.BigInt(1 * 10 ** 18);
  const sqrtPriceX96 = encodeSqrtRatioX96(numerator, denominator);
  return sqrtPriceX96;
}

export const safeGetSqrtRatioAtTick = (tick: any): bigint => {
  try {
    const tickNum = Number(tick);
    if (isNaN(tickNum)) throw new Error("Invalid tick number");
    const clampedTick = Math.min(MAX_TICK, Math.max(MIN_TICK, tickNum));
    const jsbiResult = TickMath.getSqrtRatioAtTick(clampedTick);
    return BigInt(jsbiResult.toString());
  } catch (error) {
    console.error("TickMath error:", error, "tick:", tick);
    return 0n;
  }
};

export const tickToRawPrice = (tick: number): number => {
  const sqrtPriceX96 = safeGetSqrtRatioAtTick(tick);
  const numerator = sqrtPriceX96 * sqrtPriceX96;
  const denominator = Q96 * Q96;
  return Number(numerator) / Number(denominator);
};

export const formatTickToPrice = (tick: number): string => {
  if (tick >= MAX_TICK - 1) return "+∞";
  if (tick <= MIN_TICK + 1) return "0";
  const price = tickToRawPrice(tick);
  if (Math.abs(price) > 1e6 || (Math.abs(price) < 1e-6 && price !== 0)) {
    return price.toExponential(4);
  }
  return price.toFixed(4);
};

export const formatSqrtPriceX96 = (value: bigint | string | number): string => {
  const px96 = BigInt(value);
  const numerator = px96 * px96;
  const denominator = Q96 * Q96;
  const price = Number(numerator) / Number(denominator);
  if (price > 1e6 || (price < 1e-6 && price > 0)) return price.toExponential(4);
  return price.toFixed(4);
};

export const formatTokenAmount = (
  amount: bigint,
  decimals: number,
  maxFraction = 4,
): string => {
  const raw = formatUnits(amount, decimals);
  const [, fraction] = raw.split(".");
  const shortFraction = fraction?.slice(0, maxFraction) || "";
  return shortFraction
    ? `${raw.split(".")[0]}.${shortFraction}`
    : raw.split(".")[0];
};

export const formatLiquidity = (value: bigint | string): string => {
  const num = typeof value === "bigint" ? Number(value) : parseFloat(value);
  if (num < 1e3) return num.toFixed(2);
  if (num < 1e6) return (num / 1e3).toFixed(2) + "K";
  if (num < 1e9) return (num / 1e6).toFixed(2) + "M";
  return (num / 1e9).toFixed(2) + "B";
};

export const truncateAddr = (addr: string): string => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

/**
 * 根据预期输出和滑点容忍度计算最小接受输出量
 * @param amountOutExpected 预期输出 (bigint)
 * @param slippageTolerance 滑点百分比, e.g. 0.5 表示 0.5%
 */
export const calculateMinimumReceived = (
  amountOutExpected: bigint,
  slippageTolerance: number
): bigint => {
  const bps = Math.round(slippageTolerance * 100); // convert % to basis points
  return (amountOutExpected * BigInt(10000 - bps)) / 10000n;
};

export const isAddress = (val: string): val is `0x${string}` => {
  return /^0x[0-9a-fA-F]{40}$/.test(val);
}
