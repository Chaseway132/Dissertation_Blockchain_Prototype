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

// Define contract interfaces
export interface CharityDAOPlatformContract {
  donate: (options: { value: bigint }) => Promise<ethers.ContractTransactionResponse>;
  getAllProposals: () => Promise<any[]>;
  getAllDonations: () => Promise<any[]>;
  createProposal: (description: string, amount: bigint, recipient: string) => Promise<ethers.ContractTransactionResponse>;
  voteOnProposal: (proposalId: bigint) => Promise<ethers.ContractTransactionResponse>;
  approveProposal: (proposalId: bigint) => Promise<ethers.ContractTransactionResponse>;
  executeProposal: (proposalId: bigint) => Promise<ethers.ContractTransactionResponse>;
  owner: () => Promise<string>;
  connect: (signer: any) => CharityDAOPlatformContract;
  target: string;
  interface?: ethers.Interface;
}

export interface ProposalManagementContract {
  createProposal: (description: string, amount: bigint, recipient: string) => Promise<ethers.ContractTransactionResponse>;
  getAllProposals: () => Promise<any[]>;
  markProposalApproved: (proposalId: bigint) => Promise<ethers.ContractTransactionResponse>;
  markProposalExecuted: (proposalId: bigint) => Promise<ethers.ContractTransactionResponse>;
  incrementVoteCount: (proposalId: bigint) => Promise<ethers.ContractTransactionResponse>;
  owner: () => Promise<string>;
  connect: (signer: any) => ProposalManagementContract & ethers.Contract;
  interface?: ethers.Interface;
}

export interface DonationTrackingContract {
  donate: (options: { value: bigint }) => Promise<ethers.ContractTransactionResponse>;
  getAllDonations: () => Promise<any[]>;
  isStakeholder: (address: string) => Promise<boolean>;
}

export interface VotingGovernanceContract {
  voteOnProposal: (proposalId: bigint) => Promise<ethers.ContractTransactionResponse>;
  approveProposal: (proposalId: bigint) => Promise<ethers.ContractTransactionResponse>;
  connect: (signer: any) => VotingGovernanceContract & ethers.Contract;
  interface?: ethers.Interface;
}

export interface FundAllocationContract {
  executeProposal: (proposalId: bigint) => Promise<ethers.ContractTransactionResponse>;
  allocateFunds: (recipient: string, amount: bigint) => Promise<ethers.ContractTransactionResponse>;
  getFundBalance: () => Promise<bigint>;
  getBalance: () => Promise<bigint>;
  connect: (signer: any) => FundAllocationContract & ethers.Contract;
  interface?: ethers.Interface;
}

// Reset all contract instances
let cachedContractInstances = {};

export const resetContractInstances = () => {
  cachedContractInstances = {};
  console.log("Reset all cached contract instances");
};

// Get contract with caching prevention option
export const getProposalManagementContract = async (provider, forceNew = false) => {
  const cacheKey = 'proposalManagement';
  
  if (forceNew || !cachedContractInstances[cacheKey]) {
    const { PROPOSAL_MANAGEMENT } = await import('../config/contracts');
    const ProposalManagementABI = await import('../contracts/ProposalManagement.json');
    cachedContractInstances[cacheKey] = new ethers.Contract(
      PROPOSAL_MANAGEMENT,
      ProposalManagementABI.abi,
      provider
    );
  }
  
  return cachedContractInstances[cacheKey];
};

// Apply similar pattern to other contract getter functions

// Helper functions to get contract instances
export const getCharityDAOPlatformContract = async (provider: ethers.Provider) => {
  return new ethers.Contract(
    CHARITY_DAO_PLATFORM,
    CharityDAOPlatformABI.abi,
    provider
  ) as ethers.Contract & CharityDAOPlatformContract;
};

export const getDonationTrackingContract = async (provider: ethers.Provider) => {
  return new ethers.Contract(
    DONATION_TRACKING,
    DonationTrackingABI.abi,
    provider
  ) as ethers.Contract & DonationTrackingContract;
};

export const getVotingGovernanceContract = async (provider: ethers.Provider) => {
  return new ethers.Contract(
    VOTING_GOVERNANCE,
    VotingGovernanceABI.abi,
    provider
  ) as ethers.Contract & VotingGovernanceContract;
};

export const getFundAllocationContract = async (provider: ethers.Provider) => {
  return new ethers.Contract(
    FUND_ALLOCATION,
    FundAllocationABI.abi,
    provider
  ) as ethers.Contract & FundAllocationContract;
};

export const getContracts = async (provider: ethers.Provider) => {
  const proposalManagement = new ethers.Contract(
    PROPOSAL_MANAGEMENT,
    ProposalManagementABI.abi,
    provider
  ) as ethers.Contract & ProposalManagementContract;

  const donationTracking = new ethers.Contract(
    DONATION_TRACKING,
    DonationTrackingABI.abi,
    provider
  ) as ethers.Contract & DonationTrackingContract;

  const votingGovernance = new ethers.Contract(
    VOTING_GOVERNANCE,
    VotingGovernanceABI.abi,
    provider
  ) as ethers.Contract & VotingGovernanceContract;

  const fundAllocation = new ethers.Contract(
    FUND_ALLOCATION,
    FundAllocationABI.abi,
    provider
  ) as ethers.Contract & FundAllocationContract;

  const charityDAOPlatform = new ethers.Contract(
    CHARITY_DAO_PLATFORM,
    CharityDAOPlatformABI.abi,
    provider
  ) as ethers.Contract & CharityDAOPlatformContract;

  return {
    proposalManagement,
    donationTracking,
    votingGovernance,
    fundAllocation,
    charityDAOPlatform
  };
};