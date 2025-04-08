import { ethers } from 'ethers';
import VotingGovernanceABI from '../contracts/VotingGovernance.json';
import { getProvider } from '../utils/provider';

export const PROPOSAL_MANAGEMENT = "0x40c3848fae123CEfcc284312032bb03328906F80";
export const DONATION_TRACKING = "0xDD56D4747A940b22d272ca95E6625F8C8211eC08";
export const VOTING_GOVERNANCE = "0xC0c491b0f35A11a0D261a48DC73dFD32d59798A0";
export const FUND_ALLOCATION = "0x85b19CCeD811F94c325203fb472765e0FD5dEBFA";
export const CHARITY_DAO_PLATFORM = "0x9f2Fc2B59b0F62DfeC63277899E9ad7201E711B0";

// Ganache network configuration
export const NETWORK_CONFIG = {
  chainId: "0x539", // 1337 in hex
  chainName: "Ganache",
  rpcUrls: ["http://127.0.0.1:7545"],
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18
  },
  blockExplorerUrls: []
};

export const getVotingContract = async () => {
  try {
    const provider = await getProvider();
    return new ethers.Contract(
      VOTING_GOVERNANCE,
      VotingGovernanceABI.abi,
      provider
    );
  } catch (error) {
    console.error('Error getting voting contract:', error);
    return null;
  }
}; 