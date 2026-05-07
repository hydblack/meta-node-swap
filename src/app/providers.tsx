'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '../lib/config/wagmi';
import { Web3Provider } from 'my-web3-connector'; // my-web3-connector 的 Web3Provider 组件
import { useState } from 'react';

/**
 * Providers 组合层
 *
 * - WagmiProvider + RainbowKitProvider：用于链上只读 RPC 查询
 *   （useReadContract / useReadContracts 等无需签名的调用）
 * - Web3Provider（来自 my-web3-connector）：提供自研钱包 Web3Context，
 *   所有 swap/position 写入交易及账户状态均通过此 Provider 获取
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#ec4899',
          accentColorForeground: 'white',
          borderRadius: 'large',
          fontStack: 'system',
        })}>
          {/* Web3Provider 包裹在最内层，使 useWallet() 可在所有子组件中访问 */}
          <Web3Provider>
            {children}
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
