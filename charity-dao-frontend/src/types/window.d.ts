export {};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, callback: (params: any) => void) => void;
      removeListener: (eventName: string, callback: (params: any) => void) => void;
      selectedAddress?: string;
      isMetaMask?: boolean;
      networkVersion?: string;
      chainId?: string;
    };
  }
} 