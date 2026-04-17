export const DEFAULT_PAGE_SIZE = 10;
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;
export const Q96 = 2n ** 96n;

export const CONTRACT_ADDRESSES = {
  PoolManager: '0xddC12b3F9F7C91C79DA7433D8d212FB78d609f7B' as `0x${string}`,
  PositionManager: '0xbe766Bf20eFfe431829C5d5a2744865974A0B610' as `0x${string}`,
  SwapRouter: '0xD2c220143F5784b3bD84ae12747d97C8A36CeCB2' as `0x${string}`,
};

export const TOKEN_LIST: {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
}[] = [
  {
    address: '0x4798388e3adE569570Df626040F07DF71135C48E',
    symbol: 'MNTA',
    name: 'MetaNode Token A',
    decimals: 18,
  },
  {
    address: '0x5A4eA3a013D42Cfd1B1609d19f6eA998EeE06D30',
    symbol: 'MNTB',
    name: 'MetaNode Token B',
    decimals: 18,
  },
  {
    address: '0x86B5df6FF459854ca91318274E47F4eEE245CF28',
    symbol: 'MNTC',
    name: 'MetaNode Token C',
    decimals: 18,
  },
  {
    address: '0x7af86B1034AC4C925Ef5C3F637D1092310d83F03',
    symbol: 'MNTD',
    name: 'MetaNode Token D',
    decimals: 18,
  },
];

export const FEE_TIERS = [
  { label: "0.01%", value: 100 },
  { label: "0.05%", value: 500 },
  { label: "0.30%", value: 3000 },
  { label: "1.00%", value: 10000 },
];

export const MIN_SQRT_PRICE = 4295128739n;
export const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n;