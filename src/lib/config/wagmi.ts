import { connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { createConfig, http } from 'wagmi';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
} from 'wagmi/chains';
import { myWallet } from '../wallet/myWallet';

const { wallets: defaultWallets } = getDefaultWallets({
  appName: 'MetaNodeSwap',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
});

const connectors = connectorsForWallets(
  [
    {
      groupName: 'My Wallet',
      wallets: [myWallet],
    },
    ...defaultWallets,
  ],
  {
    appName: 'MetaNodeSwap',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  }
);

const chains = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [sepolia] : []),
] as const;

export const config = createConfig({
  connectors,
  chains,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});
