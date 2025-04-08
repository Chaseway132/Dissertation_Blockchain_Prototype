import { ethers } from 'ethers';
import { 
  CHARITY_DAO_PLATFORM, 
  DONATION_TRACKING, 
  FUND_ALLOCATION, 
  PROPOSAL_MANAGEMENT, 
  VOTING_GOVERNANCE 
} from './contracts';
import { 
  CharityDAOPlatformABI_Interface,
  DonationTrackingABI_Interface,
  FundAllocationABI_Interface,
  ProposalManagementABI_Interface,
  VotingGovernanceABI_Interface
} from './abiUtils';
import { getProvider } from './provider';

// Get signer instance
export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

// Helper function to get contract instances
export const getContractInstances = async () => {
  const provider = getProvider();
  
  const platformContract = new ethers.Contract(
    CHARITY_DAO_PLATFORM,
    CharityDAOPlatformABI_Interface,
    provider
  );
  
  const donationContract = new ethers.Contract(
    DONATION_TRACKING,
    DonationTrackingABI_Interface,
    provider
  );
  
  const fundContract = new ethers.Contract(
    FUND_ALLOCATION,
    FundAllocationABI_Interface,
    provider
  );
  
  const proposalContract = new ethers.Contract(
    PROPOSAL_MANAGEMENT,
    ProposalManagementABI_Interface,
    provider
  );
  
  const votingContract = new ethers.Contract(
    VOTING_GOVERNANCE,
    VotingGovernanceABI_Interface,
    provider
  );
  
  return {
    platformContract,
    donationContract,
    fundContract,
    proposalContract,
    votingContract
  };
};

// Helper function to get a contract instance with a signer
export const getContractWithSigner = async (contractAddress: string, abi: any) => {
  const signer = await getSigner();
  return new ethers.Contract(contractAddress, abi, signer);
};

// Check and switch network if needed
export const checkAndSwitchNetwork = async (chainId: number) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  
  const provider = getProvider();
  const network = await provider.getNetwork();
  
  if (network.chainId !== BigInt(chainId)) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        throw new Error('Please add the network to MetaMask');
      }
      throw error;
    }
  }
}; 