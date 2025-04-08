import CharityDAOPlatformABI from '../contracts/CharityDAOPlatform.json';
import DonationTrackingABI from '../contracts/DonationTracking.json';
import FundAllocationABI from '../contracts/FundAllocation.json';
import ProposalManagementABI from '../contracts/ProposalManagement.json';
import VotingGovernanceABI from '../contracts/VotingGovernance.json';

// Extract the ABI array from the contract artifacts
export const CharityDAOPlatformABI_Interface = CharityDAOPlatformABI.abi;
export const DonationTrackingABI_Interface = DonationTrackingABI.abi;
export const FundAllocationABI_Interface = FundAllocationABI.abi;
export const ProposalManagementABI_Interface = ProposalManagementABI.abi;
export const VotingGovernanceABI_Interface = VotingGovernanceABI.abi; 