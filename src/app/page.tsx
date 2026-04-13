import { SwapCard } from '../components/swap/SwapCard';

export default function SwapPage() {
  return (
    <div className="w-full flex flex-col items-center gap-6 pt-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">
          Swap <span className="text-transparent bg-clip-text bg-linear-to-r from-pink-400 to-purple-500">tokens</span>
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Trade any token instantly at the best price</p>
      </div>
      <SwapCard />
    </div>
  );
}
