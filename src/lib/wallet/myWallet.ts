/**
 * MyWallet — RainbowKit Custom Wallet
 *
 * 直接对接 Chrome 扩展注入的 window.myWallet，无需中间层。
 */

import { type Wallet, type WalletDetailsParams } from '@rainbow-me/rainbowkit';
import { createConnector } from 'wagmi';

const ID = 'myWallet';

// ── wagmi Connector ───────────────────────────────────────────────────────────
function myWalletConnector() {
  // eslint-disable-next-line
  return createConnector<any>((config) => ({
    id: ID,
    name: 'MyWallet',
    type: ID,

    // eslint-disable-next-line
    async connect(_params: any = {}): Promise<any> {
      if (!window.myWallet) throw new Error('MyWallet 扩展未安装或未注入，请刷新页面');
      const account = await window.myWallet.connect();
      return {
        accounts: [account.address] as readonly `0x${string}`[],
        chainId: 11155111, // Sepolia，与扩展默认网络保持一致
      };
    },

    async disconnect() {
      await window.myWallet?.disconnect();
    },

    async getAccounts() {
      const account = await window.myWallet?.getAccount();
      return account ? [account.address as `0x${string}`] : [];
    },

    async getChainId() {
      return 11155111;
    },

    async isAuthorized() {
      try {
        const account = await window.myWallet?.getAccount();
        return !!account?.address;
      } catch {
        return false;
      }
    },

    async getProvider(): Promise<any> {
      return window.myWallet;
    },

    onAccountsChanged(accounts: string[]) {
      if (accounts.length === 0) config.emitter.emit('disconnect');
      else config.emitter.emit('change', { accounts: accounts as `0x${string}`[] });
    },

    onChainChanged(chainId: string) {
      config.emitter.emit('change', { chainId: parseInt(chainId, 16) });
    },

    onDisconnect() {
      config.emitter.emit('disconnect');
    },
  }));
}

// ── RainbowKit Wallet ─────────────────────────────────────────────────────────
export function myWallet(): Wallet {
  return {
    id: ID,
    name: 'MyWallet',
    iconUrl: '/icons/my-wallet.svg',
    iconBackground: '#1a1b1f',
    installed: typeof window !== 'undefined' && !!window.myWallet,
    createConnector: (_: WalletDetailsParams) => myWalletConnector(),
  };
}
