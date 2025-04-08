import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getContractInstances } from './utils/contractHelpers';
import DonationForm from './components/DonationForm';
import DonationList from './components/DonationList';
import ProposalList from './components/ProposalList';
import CreateProposalForm from './components/CreateProposalForm';
import TreasuryStatus from './components/TreasuryStatus';
import { Donation, RawDonation } from './types';

const App: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [filteredDonations, setFilteredDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchAddress, setSearchAddress] = useState<string>('');
  
  // Filter donations when search address changes
  useEffect(() => {
    if (!searchAddress.trim()) {
      setFilteredDonations(donations);
    } else {
      const filtered = donations.filter(donation => 
        donation.donor && 
        donation.donor.toLowerCase().includes(searchAddress.toLowerCase())
      );
      setFilteredDonations(filtered);
    }
  }, [searchAddress, donations]);
  
  const loadDonations = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading donations...');
      const { platformContract } = await getContractInstances();

      const rawDonations = await platformContract.getAllDonations();
      console.log('Raw Donations:', rawDonations);

      // Format the donations
      const formattedDonations = rawDonations
        .filter((donation: RawDonation) => 
          donation && 
          donation.donor && 
          donation.donor !== '0x0000000000000000000000000000000000000000'
        )
        .map((donation: RawDonation, index: number) => {
          // Log the raw amount for debugging
          console.log("Raw amount for donation", donation.id.toString(), ":", donation.amount.toString());
          
          // Create a deterministic transaction hash if one isn't available from the blockchain
          // In a production app, we would store and retrieve the actual transaction hash
          const fakeTransactionHash = `donation-${donation.id.toString()}-${donation.timestamp.toString()}`;
          
          return {
            id: Number(donation.id),
            donor: donation.donor,
            amount: ethers.formatEther(donation.amount),
            timestamp: donation.timestamp.toString(),
            metadataHash: donation.metadataHash,
            transactionHash: fakeTransactionHash
          };
        });

      // Sort donations by timestamp (newest first)
      formattedDonations.sort((a: Donation, b: Donation) => {
        const timeA = new Date(Number(a.timestamp) * 1000).getTime();
        const timeB = new Date(Number(b.timestamp) * 1000).getTime();
        return timeB - timeA;
      });

      setDonations(formattedDonations);
    } catch (error) {
      console.error('Error loading donations:', error);
      toast.error('Failed to load donations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  // Initialize filtered donations when donations are loaded
  useEffect(() => {
    setFilteredDonations(donations);
  }, [donations]);

  const handleDonationSuccess = useCallback(() => {
    loadDonations();
  }, [loadDonations]);

  const handleProposalCreated = useCallback(() => {
    // Reload proposals - this would be implemented in a production app
    console.log('Proposal created, would reload proposals in a production app');
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white p-4 rounded shadow-sm mb-6">
          <h1 className="text-2xl font-bold">Charity DAO Platform</h1>
        </div>
        
        <div className="mb-6">
          <TreasuryStatus />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded shadow-sm">
            <h2 className="text-xl font-bold p-4 border-b">Make a Donation</h2>
            <div className="p-4">
              <DonationForm onDonationSuccess={handleDonationSuccess} />
            </div>
          </div>
          
          <ProposalList />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded shadow-sm">
            <h2 className="text-xl font-bold p-4 border-b">Create a Proposal</h2>
            <div className="p-4">
              <CreateProposalForm onProposalCreated={handleProposalCreated} />
            </div>
          </div>
          
          <div className="bg-white rounded shadow-sm">
            <h2 className="text-xl font-bold p-4 border-b">Recent Donations</h2>
            <div className="p-4">
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    placeholder="Search by wallet address"
                    className="w-full p-2 pr-10 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchAddress && (
                    <button 
                      onClick={() => setSearchAddress('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
                {filteredDonations.length === 0 && searchAddress && (
                  <p className="text-gray-500 text-sm mt-2">No donations found for this address.</p>
                )}
              </div>
              <DonationList donations={filteredDonations} />
            </div>
          </div>
        </div>
        
        <ToastContainer position="bottom-right" />
      </div>
    </div>
  );
};

export default App;