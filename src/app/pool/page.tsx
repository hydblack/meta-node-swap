import PoolList from '../../components/pool/PoolList';

export default function PoolPage() {
  return (
    <div className="w-full flex flex-col gap-6 pt-4">
      <div>
        <h1 className="text-3xl font-bold text-white text-center">Pool</h1>
      </div>
      <PoolList />
    </div>
  );
}
