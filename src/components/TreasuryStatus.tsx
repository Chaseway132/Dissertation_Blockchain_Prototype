import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getProvider } from '../utils/web3';
import { CHARITY_DAO_PLATFORM, FUND_ALLOCATION } from '../utils/contracts';
import { getFundAllocationContract } from '../utils/contracts';

const TreasuryStatus: React.FC = () => {
  const [platformBalance, setPlatformBalance] = useState('0.0');
  const [fundBalance, setFundBalance] = useState('0.0');
  const [isLoading, setIsLoading] = useState(false);

  const loadBalances = async () => {
    try {
      setIsLoading(true);
      const provider = await getProvider();

      // Get platform balance
      const platformBalanceWei = await provider.getBalance(CHARITY_DAO_PLATFORM);
      setPlatformBalance(ethers.formatEther(platformBalanceWei));

      // Get fund balance from contract
      try {
        // Try to get balance using contract method first
        const fundContract = await getFundAllocationContract(provider);
        const fundBalanceWei = await fundContract.getBalance();
        setFundBalance(ethers.formatEther(fundBalanceWei));
      } catch (contractError) {
        console.warn('Error getting balance from contract, falling back to direct check:', contractError);
        // Fallback to direct balance check
        const fundBalanceWei = await provider.getBalance(FUND_ALLOCATION);
        setFundBalance(ethers.formatEther(fundBalanceWei));
      }
    } catch (error) {
      console.error('Error loading balances:', error);
      toast.error('Failed to load treasury balances');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  return (
    <div className="bg-white p-6 rounded shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">DAO Treasury Status</h2>
          <button
            onClick={loadBalances}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Refresh balances"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="flex gap-8 items-start">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Platform Balance</p>
            <p className="text-xl font-medium text-blue-600">{platformBalance} ETH</p>
            <p className="text-xs text-gray-400">(Temporary holding)</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Fund Balance</p>
            <p className="text-xl font-medium text-green-600">{fundBalance} ETH</p>
            <p className="text-xs text-gray-400">(Available for proposals)</p>
          </div>
        </div>
      </div>
      
      <ul className="list-disc ml-5 text-sm text-gray-600 space-y-1 mt-6">
        <li>Platform Balance: Temporary holding for incoming donations</li>
        <li>Fund Balance: Available for executing approved proposals</li>
        <li>Funds are automatically transferred to the fund contract when donations are received</li>
      </ul>
    </div>
  );
};

export default TreasuryStatus; 