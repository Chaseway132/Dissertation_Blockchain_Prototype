import { ethers } from 'ethers';
import { getProvider } from '../utils/web3';
import VotingGovernanceABI from './VotingGovernance.json';
import { DEPLOYED_ADDRESSES } from './deployedAddresses';

// Export individual addresses
export const {
  PROPOSAL_MANAGEMENT,
  DONATION_TRACKING,
  VOTING_GOVERNANCE,
  FUND_ALLOCATION,
  CHARITY_DAO_PLATFORM
} = DEPLOYED_ADDRESSES;

// Export contract ABIs
export const VOTING_GOVERNANCE_ABI = VotingGovernanceABI.abi;

// Contract configurations combining address and ABI
export const CONTRACT_CONFIGS = {
  VOTING_GOVERNANCE: {
    address: DEPLOYED_ADDRESSES.VOTING_GOVERNANCE,
    abi: VOTING_GOVERNANCE_ABI
  }
} as const;

// Type definitions
export type ContractAddresses = typeof DEPLOYED_ADDRESSES;
export type ContractConfigs = typeof CONTRACT_CONFIGS;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: "0x7a69", // 31337 in hex
  chainName: "PrimeCloud Hardhat",
  rpcUrls: ["https://dissertation-blockchain-prototype.primecloud.cloud"],
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18
  }
} as const;

// Get contract instances with proper error handling
export const getVotingContract = async () => {
  try {
    const provider = await getProvider();
    if (!DEPLOYED_ADDRESSES.VOTING_GOVERNANCE) {
      throw new Error('Voting governance contract address not configured');
    }
    return new ethers.Contract(
      DEPLOYED_ADDRESSES.VOTING_GOVERNANCE,
      VOTING_GOVERNANCE_ABI,
      provider
    );
  } catch (error) {
    console.error('Error getting voting contract:', error);
    throw error;
  }
};

// Contract ABIs
export const CONTRACT_ABI = {
  VOTING_GOVERNANCE: VOTING_GOVERNANCE_ABI
}; 