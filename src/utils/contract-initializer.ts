import { ethers } from 'ethers';
import {
  getCharityDAOPlatformContract,
  getDonationTrackingContract,
  getVotingGovernanceContract,
  getFundAllocationContract,
  getProvider
} from './contract-exports';
import {
  CHARITY_DAO_PLATFORM,
  DONATION_TRACKING,
  VOTING_GOVERNANCE,
  FUND_ALLOCATION
} from '../config/contracts';

export interface Contracts {
  charityDAOPlatform: ethers.Contract | null;
  donationTracking: ethers.Contract | null;
  votingGovernance: ethers.Contract | null;
  fundAllocation: ethers.Contract | null;
}

export const initializeContracts = async (): Promise<Contracts> => {
  try {
    console.log('🔄 Initializing contracts...');
    console.log('📋 Contract addresses:');
    console.log(`CharityDAOPlatform: ${CHARITY_DAO_PLATFORM}`);
    console.log(`DonationTracking: ${DONATION_TRACKING}`);
    console.log(`VotingGovernance: ${VOTING_GOVERNANCE}`);
    console.log(`FundAllocation: ${FUND_ALLOCATION}`);
    
    const provider = await getProvider();
    console.log('✅ Provider connected');
    
    // Initialize contracts one by one with proper error handling
    console.log('🔄 Getting CharityDAOPlatform contract...');
    let charityDAOPlatform = null;
    try {
      charityDAOPlatform = await getCharityDAOPlatformContract();
      console.log('✅ CharityDAOPlatform initialized at:', charityDAOPlatform.target);
    } catch (error) {
      console.error('❌ Failed to initialize CharityDAOPlatform contract:', error);
    }
    
    console.log('🔄 Getting DonationTracking contract...');
    let donationTracking = null;
    try {
      donationTracking = await getDonationTrackingContract();
      console.log('✅ DonationTracking initialized at:', donationTracking.target);
    } catch (error) {
      console.error('❌ Failed to initialize DonationTracking contract:', error);
    }
    
    console.log('🔄 Getting VotingGovernance contract...');
    let votingGovernance = null;
    try {
      votingGovernance = await getVotingGovernanceContract();
      console.log('✅ VotingGovernance initialized at:', votingGovernance.target);
    } catch (error) {
      console.error('❌ Failed to initialize VotingGovernance contract:', error);
    }
    
    console.log('🔄 Getting FundAllocation contract...');
    let fundAllocation = null;
    try {
      fundAllocation = await getFundAllocationContract();
      console.log('✅ FundAllocation initialized at:', fundAllocation.target);
    } catch (error) {
      console.error('❌ Failed to initialize FundAllocation contract:', error);
    }

    return {
      charityDAOPlatform,
      donationTracking,
      votingGovernance,
      fundAllocation
    };
  } catch (error) {
    console.error('❌ Error in initializeContracts:', error);
    return {
      charityDAOPlatform: null,
      donationTracking: null,
      votingGovernance: null,
      fundAllocation: null
    };
  }
};

export const getContracts = async (provider: ethers.Provider): Promise<Contracts> => {
  try {
    console.log('🔄 Getting contract instances...');
    
    // Get contracts one by one with proper error handling
    console.log('🔄 Getting CharityDAOPlatform contract...');
    let charityDAOPlatform = null;
    try {
      charityDAOPlatform = await getCharityDAOPlatformContract();
      console.log('✅ CharityDAOPlatform retrieved at:', charityDAOPlatform.target);
    } catch (error) {
      console.error('❌ Failed to get CharityDAOPlatform contract:', error);
    }
    
    console.log('🔄 Getting DonationTracking contract...');
    let donationTracking = null;
    try {
      donationTracking = await getDonationTrackingContract();
      console.log('✅ DonationTracking retrieved at:', donationTracking.target);
    } catch (error) {
      console.error('❌ Failed to get DonationTracking contract:', error);
    }
    
    console.log('🔄 Getting VotingGovernance contract...');
    let votingGovernance = null;
    try {
      votingGovernance = await getVotingGovernanceContract();
      console.log('✅ VotingGovernance retrieved at:', votingGovernance.target);
    } catch (error) {
      console.error('❌ Failed to get VotingGovernance contract:', error);
    }
    
    console.log('🔄 Getting FundAllocation contract...');
    let fundAllocation = null;
    try {
      fundAllocation = await getFundAllocationContract();
      console.log('✅ FundAllocation retrieved at:', fundAllocation.target);
    } catch (error) {
      console.error('❌ Failed to get FundAllocation contract:', error);
    }

    return {
      charityDAOPlatform,
      donationTracking,
      votingGovernance,
      fundAllocation
    };
  } catch (error) {
    console.error('❌ Error in getContracts:', error);
    return {
      charityDAOPlatform: null,
      donationTracking: null,
      votingGovernance: null,
      fundAllocation: null
    };
  }
}; 