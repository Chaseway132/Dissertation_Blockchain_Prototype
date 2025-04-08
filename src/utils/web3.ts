import { BrowserProvider } from 'ethers';
import { getContracts as getContractsUtil } from './contracts';

// Track provider instance for force refresh
let providerInstance: BrowserProvider | null = null;

export const getProvider = async (forceNew = false) => {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask to use this application');
  }
  
  // If forcing new connection or no existing instance
  if (forceNew || !providerInstance) {
    console.log("Creating new provider instance");
    // Force MetaMask to reconnect
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    providerInstance = new BrowserProvider(window.ethereum);
  }
  
  return providerInstance;
};

// Force clear the provider cache
export const resetProvider = async () => {
  providerInstance = null;
  if (window.ethereum) {
    try {
      // Clear any pending requests
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log("Provider cache cleared");
      return true;
    } catch (error) {
      console.error("Failed to reset provider:", error);
      return false;
    }
  }
  return false;
};

export const getContracts = getContractsUtil; 