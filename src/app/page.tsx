import { SwapCard } from '../components/swap/SwapCard';

export default function SwapPage() {
  return (
    <div className="w-full flex flex-col items-center gap-6 pt-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">
          Swap
        </h1>
      </div>
      <SwapCard />
    </div>
  );
}
