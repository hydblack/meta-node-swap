// src/global.d.ts

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// ── MyWallet Chrome 扩展注入的全局对象 ───────────────────────────────────────

interface MyWalletAccount {
  address: string;
  name?: string;
  publicKey?: string;
}

interface MyWalletWindow {
  /** 连接钱包，弹出授权并返回当前账户 */
  connect(): Promise<MyWalletAccount>;
  /** 获取当前账户（不弹窗） */
  getAccount(): Promise<MyWalletAccount | null>;
  /** 对消息进行签名 */
  signMessage(message: string): Promise<string>;
  /** 断开连接 */
  disconnect(): Promise<void>;
}

interface Window {
  /** Chrome 扩展 my-wallet-extention 注入的钱包对象 */
  myWallet?: MyWalletWindow;
  /** 标识扩展是否已注入（防重复注入标志位） */
  myWalletInjected?: boolean;
}
