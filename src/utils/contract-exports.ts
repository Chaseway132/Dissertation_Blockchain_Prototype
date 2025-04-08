import { ethers } from 'ethers';
import { 
  PROPOSAL_MANAGEMENT, 
  DONATION_TRACKING, 
  VOTING_GOVERNANCE, 
  FUND_ALLOCATION, 
  CHARITY_DAO_PLATFORM 
} from '../config/contracts';

// Contract ABIs
import ProposalManagementABI from '../contracts/ProposalManagement.json';
import DonationTrackingABI from '../contracts/DonationTracking.json';
import VotingGovernanceABI from '../contracts/VotingGovernance.json';
import FundAllocationABI from '../contracts/FundAllocation.json';
import CharityDAOPlatformABI from '../contracts/CharityDAOPlatform.json';

// Export contract addresses
export { 
  PROPOSAL_MANAGEMENT,
  DONATION_TRACKING,
  VOTING_GOVERNANCE,
  FUND_ALLOCATION,
  CHARITY_DAO_PLATFORM
};

// Export contract ABIs
export {
  ProposalManagementABI,
  DonationTrackingABI,
  VotingGovernanceABI,
  FundAllocationABI,
  CharityDAOPlatformABI
};

// Contract interfaces
export interface CharityDAOPlatformContract extends ethers.Contract {}
export interface ProposalManagementContract extends ethers.Contract {}
export interface DonationTrackingContract extends ethers.Contract {}
export interface VotingGovernanceContract extends ethers.Contract {}
export interface FundAllocationContract extends ethers.Contract {}

// Helper functions to get contract instances
export const getProvider = async () => {
  if (typeof window.ethereum !== 'undefined') {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error('Please install MetaMask');
};

export const getCharityDAOPlatformContract = async () => {
  const provider = await getProvider();
  return new ethers.Contract(
    CHARITY_DAO_PLATFORM,
    CharityDAOPlatformABI.abi,
    provider
  ) as CharityDAOPlatformContract;
};

export const getProposalManagementContract = async () => {
  const provider = await getProvider();
  return new ethers.Contract(
    PROPOSAL_MANAGEMENT,
    ProposalManagementABI.abi,
    provider
  ) as ProposalManagementContract;
};

export const getDonationTrackingContract = async () => {
  const provider = await getProvider();
  return new ethers.Contract(
    DONATION_TRACKING,
    DonationTrackingABI.abi,
    provider
  ) as DonationTrackingContract;
};

export const getVotingGovernanceContract = async () => {
  const provider = await getProvider();
  return new ethers.Contract(
    VOTING_GOVERNANCE,
    VotingGovernanceABI.abi,
    provider
  ) as VotingGovernanceContract;
};

export const getFundAllocationContract = async () => {
  const provider = await getProvider();
  return new ethers.Contract(
    FUND_ALLOCATION,
    FundAllocationABI.abi,
    provider
  ) as FundAllocationContract;
}; 