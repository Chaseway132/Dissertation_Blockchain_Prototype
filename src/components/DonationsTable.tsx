import React, { useState, useEffect } from 'react';
import { formatEther } from 'ethers';
import { toast } from 'react-hot-toast';
import { getFromIPFS } from '../utils/ipfs';
import type { Donation } from '../types/donation';

const DONATION_METADATA_KEY = 'donation_metadata_mapping';

// Function to get all donation metadata
const getAllDonationMetadata = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(DONATION_METADATA_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get all donation metadata:', error);
    return {};
  }
};

// Function to get specific donation metadata
const getDonationMetadata = (txHash: string): DonationMetadata | null => {
  try {
    const stored = localStorage.getItem(DONATION_METADATA_KEY);
    if (!stored) return null;

    const metadataMap = JSON.parse(stored);
    const metadata = metadataMap[txHash];
    
    if (!metadata) return null;
    
    return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
  } catch (error) {
    console.error('Failed to get donation metadata:', error);
    return null;
  }
};

interface DonationsTableProps {
  donations: Donation[];
}

interface DonationMetadata {
  donor: string;
  amount: string;
  timestamp: string;
  description: string;
  transactionHash?: string;
  ipfsHash?: string;
}

const DonationsTable: React.FC<DonationsTableProps> = ({ donations }): JSX.Element => {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState<number>(2);
  const [metadataMap, setMetadataMap] = useState<Record<string, string>>({});
  const [loadedMetadata, setLoadedMetadata] = useState<Record<string, DonationMetadata>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const DONATIONS_PER_PAGE = 2; // Number of donations to show/hide at a time

  useEffect(() => {
    // Load IPFS hashes from localStorage
    const stored = getAllDonationMetadata();
    console.log('Loaded metadata from localStorage:', stored);
    setMetadataMap(stored);
  }, []);

  useEffect(() => {
    // Load metadata for visible donations
    const loadMetadata = async () => {
      const visibleDonationsList = donations.slice(0, visibleCount);
      console.log('Loading metadata for visible donations:', visibleDonationsList);
      
      for (const donation of visibleDonationsList) {
        const ipfsHash = metadataMap[donation.transactionHash] || donation.metadataHash || '';
        console.log('Processing donation:', {
          id: donation.id.toString(),
          transactionHash: donation.transactionHash,
          ipfsHash,
          hasLoadedMetadata: !!loadedMetadata[ipfsHash],
          isLoading: loadingStates[ipfsHash]
        });
        
        if (ipfsHash && !loadedMetadata[ipfsHash] && !loadingStates[ipfsHash]) {
          setLoadingStates(prev => ({ ...prev, [ipfsHash]: true }));
          
          try {
            console.log('Fetching metadata for hash:', ipfsHash);
            let metadata: DonationMetadata | null = null;
            
            // First try to parse the IPFS hash itself as it might be the metadata JSON
            try {
              const parsedMetadata = JSON.parse(ipfsHash);
              console.log('Successfully parsed stored data:', parsedMetadata);
              
              // Less strict validation - just check if it has any of the expected fields
              if (typeof parsedMetadata === 'object' && parsedMetadata !== null) {
                if ('donor' in parsedMetadata || 'amount' in parsedMetadata || 'timestamp' in parsedMetadata) {
                  metadata = parsedMetadata as DonationMetadata;
                  console.log('Found valid metadata in localStorage:', metadata);
                } else {
                  console.log('Parsed data is missing required fields:', parsedMetadata);
                }
              }
            } catch (parseError) {
              // If parsing fails, try to fetch from IPFS
              console.log('Parsing stored data failed, fetching from IPFS...', parseError);
              try {
                metadata = await getFromIPFS(ipfsHash);
                console.log('Successfully fetched from IPFS:', metadata);
              } catch (ipfsError) {
                console.error('IPFS fetch failed:', ipfsError);
                throw ipfsError;
              }
            }
            
            if (metadata) {
              console.log('Setting metadata for hash:', ipfsHash, metadata);
              setLoadedMetadata(prev => ({
                ...prev,
                [ipfsHash]: metadata as DonationMetadata
              }));
            } else {
              console.log('No valid metadata found for hash:', ipfsHash);
            }
          } catch (error) {
            console.error(`Failed to load metadata for donation ${donation.id}:`, error);
            toast.error('Failed to load donation metadata');
          } finally {
            setLoadingStates(prev => ({ ...prev, [ipfsHash]: false }));
          }
        }
      }
    };

    loadMetadata();
  }, [donations, visibleCount, metadataMap]);

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'Unknown';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatTimestamp = (timestamp: bigint | string) => {
    try {
      // Try parsing as a date string first
      let date: Date;
      if (typeof timestamp === 'string' && timestamp.includes('T')) {
        // If it's an ISO string
        date = new Date(timestamp);
      } else {
        // If it's a Unix timestamp (either seconds or milliseconds)
        const timestampNum = Number(timestamp);
        date = new Date(timestampNum > 1e12 ? timestampNum : timestampNum * 1000);
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error, 'timestamp:', timestamp);
      return 'Invalid Date';
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard!`);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const toggleExpand = (id: string | number) => {
    setExpandedCards((prevCards) => ({
      ...prevCards,
      [id.toString()]: !prevCards[id.toString()]
    }));
  };

  const handleShowMore = () => {
    setVisibleCount(prev => prev + DONATIONS_PER_PAGE);
  };

  const handleShowLess = () => {
    setVisibleCount(DONATIONS_PER_PAGE);
    // Optionally collapse any expanded cards that will be hidden
    setExpandedCards({});
  };

  const visibleDonationsList = donations.slice(0, visibleCount);

  const renderMetadataLink = (txHash: string) => {
    const metadata = getDonationMetadata(txHash);
    if (!metadata?.ipfsHash) return 'No metadata available';

    return (
      <a
        href={`https://gateway.pinata.cloud/ipfs/${metadata.ipfsHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-700 underline"
      >
        View Metadata on IPFS
      </a>
    );
  };

  return (
    <div className="space-y-4">
      {donations.length === 0 ? (
        <p>No donations found.</p>
      ) : (
        <>
          <div className="grid gap-4">
            {visibleDonationsList.map((donation) => {
              const isExpanded = expandedCards[donation.id.toString()];
              const ipfsHash = metadataMap[donation.transactionHash] || donation.metadataHash || '';
              const metadata = ipfsHash ? loadedMetadata[ipfsHash] : null;
              const isLoading = ipfsHash ? loadingStates[ipfsHash] : false;
              
              console.log('Rendering donation:', {
                id: donation.id.toString(),
                ipfsHash,
                hasMetadata: !!metadata,
                metadata,
                isLoading
              });
              
              return (
                <div 
                  key={donation.id}
                  className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    {/* Compact View - Always Visible */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-grow">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl font-bold text-blue-600">
                            {Number(donation.amount).toFixed(4)} ETH
                          </span>
                        </div>
                        <div className="flex items-center group">
                          <code className="bg-gray-50 px-2 py-1 rounded text-sm font-mono text-gray-600 hover:bg-gray-100 transition-colors cursor-copy"
                                onClick={() => copyToClipboard(donation.donor, 'Address')}
                                title="Click to copy address">
                            {donation.donor}
                          </code>
                          <button
                            onClick={() => copyToClipboard(donation.donor, 'Address')}
                            className="ml-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy address"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExpand(donation.id)}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none ml-4"
                      >
                        {isExpanded ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Expanded View */}
                    {isExpanded && (
                      <>
                        <div className="pt-2 border-t border-gray-100">
                          {/* Timestamp and IPFS */}
                          <div className="flex flex-wrap justify-between items-center gap-2 text-sm">
                            <div className="text-gray-500">
                              {formatTimestamp(donation.timestamp)}
                            </div>
                            <div className="flex items-center space-x-2">
                              {ipfsHash ? (
                                <div className="flex items-center space-x-2">
                                  <a
                                    href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-sm font-medium hover:bg-purple-100 transition-colors"
                                  >
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    View Metadata on IPFS
                                  </a>
                                  <button
                                    onClick={() => copyToClipboard(ipfsHash, 'IPFS hash')}
                                    className="text-purple-600 hover:text-purple-700"
                                    title="Copy IPFS hash"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">No metadata</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show More/Less Button */}
          {donations.length > DONATIONS_PER_PAGE && (
            <div className="flex justify-center pt-4">
              <button
                onClick={visibleCount > DONATIONS_PER_PAGE ? handleShowLess : handleShowMore}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {visibleCount > DONATIONS_PER_PAGE ? (
                  <>
                    Show Less
                    <svg className="ml-2 -mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    Show More
                    <svg className="ml-2 -mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DonationsTable; 