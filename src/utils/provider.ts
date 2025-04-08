import { ethers } from 'ethers';
import { NETWORK_CONFIG } from '../config/contracts';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const getProvider = () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  // Create and return a BrowserProvider
  return new ethers.BrowserProvider(window.ethereum);
};

// This function is used to check and switch networks
export const checkAndSwitchNetwork = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Request account access
    console.log('Requesting account access...');
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log('Account access granted');
    
    // Check if we're on the correct network
    console.log('Checking network...');
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log('Current chain ID:', chainId, 'Expected:', NETWORK_CONFIG.chainId);
    
    if (chainId !== NETWORK_CONFIG.chainId) {
      console.log('Network mismatch, attempting to switch...');
      try {
        // Try to switch to the correct network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: NETWORK_CONFIG.chainId }],
        });
        console.log('Network switched successfully');
      } catch (switchError: any) {
        console.log('Error switching network:', switchError);
        // If the network doesn't exist, add it
        if (switchError.code === 4902) {
          console.log('Network not found, attempting to add it...');
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG],
          });
          console.log('Network added successfully');
        } else {
          console.error('Failed to switch network:', switchError);
          throw switchError;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking/switching network:', error);
    throw error;
  }
}; 