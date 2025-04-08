import React, { useState, useEffect } from 'react';
import { Donation } from '../types';

// Constants for localStorage
const DONATION_METADATA_KEY = 'donation_ipfs_mapping';

// Helper function to get donation metadata
const getDonationMetadata = (txHash: string): string | null => {
  try {
    const stored = localStorage.getItem(DONATION_METADATA_KEY);
    if (!stored) return null;
    
    const metadataMap = JSON.parse(stored);
    return metadataMap[txHash] || null;
  } catch (error) {
    console.error('Failed to get donation metadata:', error);
    return null;
  }
};

interface DonationListProps {
  donations: Donation[];
}

const DonationList: React.FC<DonationListProps> = ({ donations }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [metadataMap, setMetadataMap] = useState<Record<string, string>>({});

  // Load metadata for donations when component mounts or donations change
  useEffect(() => {
    const loadMetadata = async () => {
      const newMetadataMap: Record<string, string> = {};
      
      for (const donation of donations) {
        if (donation.transactionHash) {
          const ipfsHash = getDonationMetadata(donation.transactionHash);
          if (ipfsHash) {
            newMetadataMap[donation.id] = ipfsHash;
          }
        }
      }
      
      setMetadataMap(newMetadataMap);
    };
    
    loadMetadata();
  }, [donations]);

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'Unknown';
    return `${address}`;
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Get short version of IPFS hash for display
  const formatIpfsHash = (hash: string) => {
    if (!hash) return '';
    if (hash.length <= 16) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 6)}`;
  };

  if (!donations || donations.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">No donations found.</p>
      </div>
    );
  }

  // Determine which donations to display
  const displayedDonations = showAll ? donations : donations.slice(0, 2);

  return (
    <div>
      {displayedDonations.map((donation) => (
        <div 
          key={donation.id} 
          className="border rounded-lg mb-4 overflow-hidden shadow-sm"
        >
          <div 
            className="p-4 cursor-pointer"
            onClick={() => toggleExpand(donation.id)}
          >
            <div className="flex justify-between items-center">
              <span className="text-blue-600 text-2xl font-medium">{donation.amount} ETH</span>
              <button className="text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d={expandedId === donation.id ? 
                    "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" :
                    "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  } clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="text-gray-500 text-sm mt-2">
              {formatAddress(donation.donor)}
            </div>
          </div>
          
          {expandedId === donation.id && (
            <div className="border-t p-4 bg-gray-50">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div>{formatDate(donation.timestamp)}</div>
                <div>
                  {metadataMap[donation.id] ? (
                    <a 
                      href={`https://gateway.pinata.cloud/ipfs/${metadataMap[donation.id]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                    >
                      <svg 
                        className="w-4 h-4 mr-1" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      View on IPFS
                      <span className="text-xs text-gray-500 ml-1">
                        ({formatIpfsHash(metadataMap[donation.id])})
                      </span>
                    </a>
                  ) : (
                    'No metadata'
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {donations.length > 2 && (
        <div className="text-center mt-4">
          <button 
            className="text-blue-600 font-medium text-sm flex items-center mx-auto"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : 'Show More'}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d={showAll ? 
                "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" :
                "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              } clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default DonationList; 