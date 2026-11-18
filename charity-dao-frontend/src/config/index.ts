import { ethers } from 'ethers';

// Network configuration
export const NETWORK_CONFIG = {
  chainId: '0x7a69', // 31337 in hex
  chainName: 'PrimeCloud Hardhat',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://dissertation-blockchain-prototype.primecloud.cloud'],
};

// Contract configuration
export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '';

// Provider configuration
export const getProvider = async () => {
  if (typeof window.ethereum !== 'undefined') {
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error('No ethereum provider found');
}; 