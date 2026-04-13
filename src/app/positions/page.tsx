import PositionList from '../../components/positions/PositionList';

export default function PositionsPage() {
  return (
    <div className="w-full flex flex-col gap-6 pt-4">
      <div>
        <h1 className="text-3xl font-bold text-white text-center">Positions</h1>
      </div>
      <PositionList />
    </div>
  );
}
