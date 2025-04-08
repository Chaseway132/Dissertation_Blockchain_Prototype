import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import { getProvider, resetProvider } from '../utils/web3';
import { getProposalManagementContract, getVotingGovernanceContract, getDonationTrackingContract, getFundAllocationContract, getCharityDAOPlatformContract } from '../utils/contracts';
import { uploadVoteToIPFS, uploadExecutionToIPFS, uploadApprovalToIPFS, uploadDonationToIPFS } from '../utils/ipfs';

// Constants for localStorage
const DONATION_METADATA_KEY = 'donation_ipfs_mapping';

// Helper function to save donation metadata to localStorage
const saveDonationMetadata = (txHash: string, ipfsHash: string) => {
  try {
    // Get existing metadata or initialize new object
    const existingData = localStorage.getItem(DONATION_METADATA_KEY);
    const metadataMap = existingData ? JSON.parse(existingData) : {};
    
    // Add new entry
    metadataMap[txHash] = ipfsHash;
    
    // Save back to localStorage
    localStorage.setItem(DONATION_METADATA_KEY, JSON.stringify(metadataMap));
    console.log('Donation metadata saved to localStorage:', { txHash, ipfsHash });
  } catch (error) {
    console.error('Failed to save donation metadata to localStorage:', error);
  }
};

interface Proposal {
  id: number;
  description: string;
  amount: string;
  votesFor: number;
  votesAgainst: number;
  recipient: string;
  status: string;
  approved: boolean;
  executed: boolean;
  votingEndTime?: number;
}

// Move formatTimeRemaining outside the ProposalList component
const formatTimeRemaining = (milliseconds: number): string => {
  if (milliseconds <= 0) return "0 seconds";
  
  const seconds = Math.floor(milliseconds / 1000) % 60;
  const minutes = Math.floor(milliseconds / (1000 * 60)) % 60;
  const hours = Math.floor(milliseconds / (1000 * 60 * 60)) % 24;
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  
  // Just show the two most significant time units
  return parts.slice(0, 2).join(', ');
};

// Create a TimeCountdown component to handle real-time updates
const TimeCountdown = ({ endTime }: { endTime: number }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  
  useEffect(() => {
    // Function to update the remaining time
    const updateTimeRemaining = () => {
      const currentTime = Date.now();
      const endTimeMs = endTime * 1000;
      
      if (currentTime > endTimeMs) {
        setTimeRemaining("Voting period has ended");
        return;
      }
      
      const milliseconds = endTimeMs - currentTime;
      setTimeRemaining(formatTimeRemaining(milliseconds));
    };
    
    // Update immediately and then set an interval
    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [endTime]);
  
  return <span>{timeRemaining}</span>;
};

const ProposalList: React.FC = () => {
  // Helper function to format time remaining
  const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds <= 0) return "0 seconds";
    
    const seconds = Math.floor(milliseconds / 1000) % 60;
    const minutes = Math.floor(milliseconds / (1000 * 60)) % 60;
    const hours = Math.floor(milliseconds / (1000 * 60 * 60)) % 24;
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    
    // Just show the two most significant time units
    return parts.slice(0, 2).join(', ');
  };

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStakeholder, setIsStakeholder] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [executingProposal, setExecutingProposal] = useState<number | null>(null);
  const [votingProposal, setVotingProposal] = useState<number | null>(null);
  const [votedProposals, setVotedProposals] = useState<{[address: string]: number[]}>({});
  const [stakeholderInfo, setStakeholderInfo] = useState<{status: boolean, checked: boolean}>({status: false, checked: false});
  const [contractAddresses, setContractAddresses] = useState<{[key: string]: string}>({});
  const [forceReconnect, setForceReconnect] = useState(0);

  // Filter proposals when search address changes
  useEffect(() => {
    if (!searchAddress.trim()) {
      setFilteredProposals(proposals);
    } else {
      const filtered = proposals.filter(proposal => 
        proposal.recipient && 
        proposal.recipient.toLowerCase().includes(searchAddress.toLowerCase())
      );
      setFilteredProposals(filtered);
    }
  }, [searchAddress, proposals]);

  // Update filtered proposals when proposals change
  useEffect(() => {
    setFilteredProposals(proposals);
  }, [proposals]);

  // Check user's role (stakeholder/owner)
  const checkUserRole = async () => {
    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Update connected address (DON'T clear voted proposals here)
      setConnectedAddress(userAddress);
      
      // Check if user is owner
      const proposalContract = await getProposalManagementContract(provider);
      const owner = await proposalContract.owner();
      const isOwnerAccount = owner.toLowerCase() === userAddress.toLowerCase();
      setIsOwner(isOwnerAccount);
      
      // Check if user is stakeholder (if owner, automatically consider as stakeholder)
      if (isOwnerAccount) {
        console.log(`${userAddress} is the owner - automatically granting stakeholder status`);
        setIsStakeholder(true);
        setStakeholderInfo({status: true, checked: true});
        return {address: userAddress, isStakeholder: true};
      }
      
      // Only check stakeholder status with contract if not owner
      const donationContract = await getDonationTrackingContract(provider);
      console.log(`Checking if ${userAddress} is a stakeholder...`);
      const userIsStakeholder = await donationContract.isStakeholder(userAddress);
      console.log(`Stakeholder status from contract: ${userIsStakeholder}`);
      setIsStakeholder(userIsStakeholder);
      setStakeholderInfo({status: userIsStakeholder, checked: true});

      return {address: userAddress, isStakeholder: isOwnerAccount || userIsStakeholder};
    } catch (error) {
      console.error('Error checking user role:', error);
      return null;
    }
  };

  // Get proposal status based on votes and approval/execution status
  const getProposalStatus = (votes: number, approved: boolean, executed: boolean, votingEndTime?: number): string => {
    if (executed) return "Executed";
    if (approved) return "Approved";
    
    // Check if voting period has ended
    if (votingEndTime && Date.now() > votingEndTime * 1000) {
      return votes >= 3 ? "Pending Approval" : "Voting Ended";
    }
    
    if (votes >= 3) return "Pending Approval";
    return "Voting Active";
  };

  // Load proposals from contract
  const loadProposals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await checkUserRole();
      
      const provider = await getProvider();
      const proposalContract = await getProposalManagementContract(provider);
      
      try {
        // Force provider to refresh its data
        await provider.send("eth_blockNumber", []);
        
        // Get proposals from contract
        const rawProposals = await proposalContract.getAllProposals();
        
        if (rawProposals && Array.isArray(rawProposals)) {
          // Format proposals
          const formattedProposals = rawProposals.map((proposal, index) => {
            let amountStr = "0.1"; // Default fallback
            if (proposal.amountRequested) {
              try {
                const amountBigInt = typeof proposal.amountRequested === 'bigint' 
                  ? proposal.amountRequested 
                  : BigInt(proposal.amountRequested.toString());
                
                if (amountBigInt > 0n) {
                  amountStr = ethers.formatEther(amountBigInt);
                }
              } catch (error) {
                console.error('Error formatting amount:', error);
              }
            }
            
            // Get vote count
            const voteCount = Number(proposal.voteCount || 0);
            
            // Extract voting end time if available or set a test value
            // For testing, set the voting end time to 3 minutes from now for active proposals
            const now = Math.floor(Date.now() / 1000);
            let votingEndTime;
            
            if (proposal.votingEndTime) {
              // Use the actual value if available
              votingEndTime = Number(proposal.votingEndTime);
            } else if (!proposal.approved && !proposal.executed) {
              // For active proposals, simulate 3 minutes from now
              votingEndTime = now + 180;
            } else {
              // For approved/executed proposals, set to a past time
              votingEndTime = now - 60;
            }
            
            return {
              id: index + 1, // Use 1-based indexing to match contract
              description: proposal.description || '',
              amount: amountStr,
              recipient: proposal.recipient || '',
              votesFor: voteCount,
              votesAgainst: 0, // Not tracked separately in contract
              status: getProposalStatus(voteCount, proposal.approved || false, proposal.executed || false, votingEndTime),
              approved: proposal.approved || false,
              executed: proposal.executed || false,
              votingEndTime: votingEndTime
            };
          });
          
          setProposals(formattedProposals);
          
          // Check which proposals the current user has voted on
          checkVotedProposalsDirectly();
        } else {
          setError('Failed to retrieve proposals, using demo data');
          setProposals([{
            id: 1,
            description: "Funds request for flood victims",
            amount: "0.1",
            recipient: "0x1042e02782f43aC63E46A472e7EAC43d40Af7148",
            votesFor: 3,
            votesAgainst: 0,
            status: "Pending Approval",
            approved: false,
            executed: false
          }]);
        }
      } catch (error) {
        console.error('Error fetching proposals:', error);
        setError('Failed to load proposals, using demo data');
        setProposals([{
          id: 1,
          description: "Funds request for flood victims",
          amount: "0.1",
          recipient: "0x1042e02782f43aC63E46A472e7EAC43d40Af7148",
          votesFor: 3,
          votesAgainst: 0,
          status: "Pending Approval",
          approved: false,
          executed: false
        }]);
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  };

  // Check directly with the contract if the user has voted on each proposal
  const checkVotedProposalsDirectly = async () => {
    if (!connectedAddress) return;
    
    try {
      const provider = await getProvider();
      const proposalContract = await getProposalManagementContract(provider);
      const votedList: {[address: string]: number[]} = {...votedProposals};
      
      // Check each proposal for this user's address
      for (const proposal of proposals) {
        try {
          // Call hasVoted on the contract if the function exists
          try {
            // @ts-ignore - this method may exist on the contract based on ABI
            const hasVotedResult = await proposalContract.hasVoted(proposal.id, connectedAddress);
            if (hasVotedResult) {
              console.log(`Proposal ${proposal.id}: User has already voted according to contract`);
              // Update the voted list for this address
              if (!votedList[connectedAddress]) {
                votedList[connectedAddress] = [];
              }
              if (!votedList[connectedAddress].includes(proposal.id)) {
                votedList[connectedAddress].push(proposal.id);
              }
            }
          } catch (error) {
            // Cast the error to any to access message property safely
            const hasVotedError = error as { message?: string };
            console.log(`hasVoted function not available or errored: ${hasVotedError.message || 'Unknown error'}`);
            
            // Alternative: check vote count and compare with previous votes
            // This is a workaround if hasVoted is not available
            console.log(`Checking vote count for proposal ${proposal.id}`);
          }
        } catch (error) {
          console.log(`Could not verify vote status for proposal ${proposal.id}`);
        }
      }
      
      // Update state if we found any votes
      if (Object.keys(votedList).length > 0) {
        setVotedProposals(votedList);
      }
    } catch (error) {
      console.error('Error checking voted proposals directly:', error);
    }
  };

  // Handle voting on a proposal with event tracking
  const handleVote = async (proposalId: number) => {
    try {
      // Get role information
      const roleInfo = await checkUserRole();
      
      if (!roleInfo?.isStakeholder) {
        toast.error('Only stakeholders can vote on proposals. Please make a donation first!');
        return;
      }
      
      // Check if voting period has ended
      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal?.votingEndTime && Date.now() > proposal.votingEndTime * 1000) {
        toast.error('Voting period has ended for this proposal');
        return;
      }
      
      setVotingProposal(proposalId);
      
      // Get current user address
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Double-check stakeholder status before continuing
      const donationContract = await getDonationTrackingContract(provider);
      const isUserStakeholder = await donationContract.isStakeholder(userAddress);
      console.log(`Pre-vote stakeholder check: ${userAddress} is stakeholder? ${isUserStakeholder}`);
      
      if (!isUserStakeholder) {
        toast.error('Your account is not registered as a stakeholder. Please make a donation first!');
        setIsStakeholder(false);
        return;
      }
      
      // Setup event listener for vote events
      const proposalContract = await getProposalManagementContract(provider);
      
      // Listen for vote events (will help us detect successful votes)
      proposalContract.on("VoteCasted", (votedProposalId: bigint | number, voter: string) => {
        console.log(`Vote event detected: Proposal ${votedProposalId} voted by ${voter}`);
        
        const proposalIdNum = Number(votedProposalId);
        
        // Update UI if this is the current user
        if (voter.toLowerCase() === userAddress.toLowerCase()) {
          console.log("Vote confirmed via event!");
          toast.success("Your vote was recorded successfully!");
          
          // Update the voted list
          setVotedProposals(prev => ({
            ...prev,
            [userAddress]: [...(prev[userAddress] || []), proposalIdNum]
          }));
          
          // Reload proposals
          loadProposals();
        }
      });
      
      // Clean up listener after 30 seconds (to prevent memory leaks)
      setTimeout(() => {
        proposalContract.removeAllListeners("VoteCasted");
        console.log("Vote event listener removed");
      }, 30000);
      
      console.log(`Attempting to vote on proposal ID: ${proposalId} as ${userAddress}`);
      
      try {
        // CRITICAL FIX: Use ProposalManagement contract directly instead of VotingGovernance
        // The ProposalManagement contract has proper index handling in incrementVoteCount
        const proposalContractWithSigner = proposalContract.connect(signer);
        
        // Convert to bigint for contract call - use as-is
        const proposalIdBigInt = BigInt(proposalId);
        
        console.log(`Calling incrementVoteCount directly with ID: ${proposalIdBigInt}`);
        
        // Submit transaction - DIRECT CALL
        const tx = await proposalContractWithSigner.incrementVoteCount(proposalIdBigInt);
        
        console.log("Vote transaction submitted:", tx.hash);
        toast.info(`Transaction sent: ${tx.hash.substring(0, 10)}... (Check your wallet for status)`);
        
        // Try to get the receipt to see if it succeeded or failed
        try {
          const receipt = await tx.wait();
          // Check for null receipt (shouldn't happen if wait() resolves)
          if (receipt) {
            console.log("Vote transaction receipt:", receipt);
            
            if (receipt.status === 1) {
              toast.success("Vote transaction confirmed successfully!");
              // Mark as voted on success
              setVotedProposals(prev => ({
                ...prev,
                [userAddress]: [...(prev[userAddress] || []), proposalId]
              }));
              
              // Upload vote metadata to IPFS
              try {
                // Prepare vote metadata
                const timestamp = new Date().toISOString();
                const voteMetadata = {
                  proposalId: proposalId.toString(),
                  voterAddress: userAddress,
                  timestamp,
                  transactionHash: tx.hash,
                  blockNumber: receipt.blockNumber.toString(),
                  blockHash: receipt.blockHash,
                  gasUsed: receipt.gasUsed.toString(),
                  description: proposal ? proposal.description : "Unknown proposal"
                };
                
                // Upload to IPFS
                const ipfsHash = await uploadVoteToIPFS(
                  proposalId.toString(),
                  userAddress,
                  timestamp,
                  JSON.stringify(voteMetadata)
                );
                
                console.log("Vote metadata stored on IPFS with hash:", ipfsHash);
                toast.success("Vote metadata stored on IPFS");
              } catch (ipfsError) {
                console.error("Failed to upload vote metadata to IPFS:", ipfsError);
                // Don't block the UI flow if IPFS upload fails
                toast.warning("Vote successful, but metadata storage failed");
              }
            } else {
              toast.error("Vote transaction failed on the blockchain");
              console.error("Transaction reverted with status 0:", receipt);
            }
          } else {
            toast.warning("Transaction receipt was null, status unknown");
          }
        } catch (receiptError) {
          console.error("Error getting transaction receipt:", receiptError);
          toast.warning("Transaction may have failed. See console for details.");
        }
      } catch (error: any) {
        console.error('Vote submission failed:', error);
        
        // Check for specific error messages from the contract
        if (error.message && error.message.includes("Only stakeholders can vote")) {
          toast.error("You must be a stakeholder to vote. Please donate to become a stakeholder.");
          // Refresh stakeholder status since it might be incorrect
          checkUserRole();
        } else if (error.message && error.message.includes("You have already voted")) {
          toast.warning("You have already voted on this proposal.");
          // Add to voted list since the blockchain shows this account has voted
          setVotedProposals(prev => ({
            ...prev,
            [userAddress]: [...(prev[userAddress] || []), proposalId]
          }));
        } else if (error.message && error.message.includes("Voting period ended")) {
          toast.error("Voting period has ended for this proposal.");
        } else {
          toast.error("Vote failed: " + (error.reason || error.message || "Unknown error"));
        }
      }
    } catch (error: any) {
      console.error('Fatal error in vote handler:', error);
      toast.error('Something went wrong with the voting process');
    } finally {
      setVotingProposal(null);
    }
  };

  // Handle approving a proposal (owner only)
  const handleApprove = async (proposalId: number) => {
    try {
      if (!isOwner) {
        toast.error('Only the owner can approve proposals');
        return;
      }
      
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const proposalContract = await getProposalManagementContract(provider);
      const contractWithSigner = proposalContract.connect(signer);
      
      toast.info('Approving proposal, please wait...');
      const tx = await contractWithSigner.markProposalApproved(BigInt(proposalId));
      
      toast.info(`Transaction sent: ${tx.hash.substring(0, 10)}... (Check your wallet for status)`);
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        toast.success('Proposal approved successfully!');
        
        // Upload approval metadata to IPFS
        try {
          // Get the proposal details for metadata
          const proposal = proposals.find(p => p.id === proposalId);
          const timestamp = new Date().toISOString();
          
          const approvalMetadata = {
            proposalId: proposalId.toString(),
            approverAddress: userAddress,
            timestamp,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber.toString(),
            blockHash: receipt.blockHash,
            gasUsed: receipt.gasUsed.toString(),
            description: proposal ? proposal.description : "Unknown proposal"
          };
          
          // Use the dedicated approval upload function instead of vote
          const ipfsHash = await uploadApprovalToIPFS(
            proposalId.toString(),
            userAddress,
            timestamp,
            JSON.stringify(approvalMetadata)
          );
          
          console.log("Approval metadata stored on IPFS with hash:", ipfsHash);
          // Don't show toast to avoid UI clutter
        } catch (ipfsError) {
          console.error("Failed to upload approval metadata to IPFS:", ipfsError);
          // Don't block the UI flow if IPFS upload fails
        }
        
        loadProposals();
      } else {
        toast.error('Failed to approve proposal');
      }
    } catch (error: any) {
      console.error('Error approving proposal:', error);
      toast.error('Failed to approve proposal');
    }
  };

  // Handle executing a proposal (owner only)
  const handleExecute = async (proposalId: number, recipient: string, amount: string) => {
    try {
      if (!isOwner) {
        toast.error('Only the owner can execute proposals');
        return;
      }
      
      setExecutingProposal(proposalId);
      
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const fundContract = await getFundAllocationContract(provider);
      const contractWithSigner = fundContract.connect(signer);
      
      try {
        toast.info('Executing proposal, please wait...');
        const tx = await contractWithSigner.executeProposal(BigInt(proposalId));
        toast.info(`Transaction sent: ${tx.hash.substring(0, 10)}... (Check your wallet for status)`);
        
        const receipt = await tx.wait();
        
        if (receipt && receipt.status === 1) {
          toast.success('Proposal executed successfully!');
          
          // Upload execution metadata to IPFS
          try {
            // Get the proposal details for metadata
            const proposal = proposals.find(p => p.id === proposalId);
            const timestamp = new Date().toISOString();
            
            const executionMetadata = {
              proposalId: proposalId.toString(),
              executorAddress: userAddress,
              recipient,
              amount,
              timestamp,
              transactionHash: tx.hash,
              blockNumber: receipt.blockNumber.toString(),
              blockHash: receipt.blockHash,
              gasUsed: receipt.gasUsed.toString(),
              description: proposal ? proposal.description : "Unknown proposal"
            };
            
            // Upload to IPFS
            const ipfsHash = await uploadExecutionToIPFS(
              proposalId.toString(),
              userAddress,
              recipient,
              amount,
              timestamp,
              tx.hash,
              JSON.stringify(executionMetadata)
            );
            
            console.log("Execution metadata stored on IPFS with hash:", ipfsHash);
            // Don't show toast to avoid UI clutter
          } catch (ipfsError) {
            console.error("Failed to upload execution metadata to IPFS:", ipfsError);
            // Don't block the UI flow if IPFS upload fails
          }
          
          loadProposals();
        } else {
          toast.error('Failed to execute proposal');
        }
      } catch (error: any) {
        console.error('Execution failed:', error);
        toast.error('Failed to execute proposal');
      }
    } catch (error: any) {
      console.error('Error executing proposal:', error);
      toast.error('Failed to execute proposal');
    } finally {
      setExecutingProposal(null);
    }
  };

  // Toggle proposal expansion
  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Call this in useEffect to load proposals when component mounts
  useEffect(() => {
    const fetchData = async () => {
      await loadProposals();
    };
    fetchData();
  }, [forceReconnect]); // Add forceReconnect dependency

  // Determine if current user has voted on a proposal
  const hasVoted = (proposalId: number): boolean => {
    if (!connectedAddress) return false;
    const addressVotes = votedProposals[connectedAddress] || [];
    return addressVotes.includes(proposalId);
  };

  // Add a manual check button for the expanded UI
  const checkVoteStatus = async (proposalId: number) => {
    if (!connectedAddress) {
      toast.info("No wallet connected");
      return;
    }
    
    toast.info("Checking vote status from blockchain...");
    await checkVotedProposalsDirectly();
    toast.success("Vote status refreshed");
  };

  // Get contract addresses
  const loadContractAddresses = async () => {
    try {
      // Import contract addresses directly here
      const { 
        PROPOSAL_MANAGEMENT, 
        DONATION_TRACKING, 
        VOTING_GOVERNANCE, 
        FUND_ALLOCATION, 
        CHARITY_DAO_PLATFORM 
      } = await import('../config/contracts');
      
      // Get contract addresses 
      const addresses = {
        proposalManagement: PROPOSAL_MANAGEMENT,
        donationTracking: DONATION_TRACKING,
        votingGovernance: VOTING_GOVERNANCE,
        fundAllocation: FUND_ALLOCATION,
        charityDaoPlatform: CHARITY_DAO_PLATFORM
      };
      
      setContractAddresses(addresses);
      console.log('Contract addresses loaded:', addresses);
      return addresses;
    } catch (error) {
      console.error('Error loading contract addresses:', error);
      return null;
    }
  };

  // Make direct donation to ensure stakeholder status
  const makeDonation = async () => {
    try {
      toast.info("Sending donation to become a stakeholder...");
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // First try the CharityDAOPlatform donate function
      try {
        const platformContract = await getCharityDAOPlatformContract(provider);
        const platformWithSigner = platformContract.connect(signer);
        
        // Cast to any to avoid TypeScript errors with the donate method
        const tx = await (platformWithSigner as any).donate({
          value: ethers.parseEther("0.01")
        });
        
        toast.info(`Donation transaction submitted: ${tx.hash.substring(0, 8)}...`);
        
        const receipt = await tx.wait();
        
        // After successful donation, upload metadata to IPFS
        if (receipt && receipt.status === 1) {
          try {
            const timestamp = new Date().toISOString();
            
            // Create metadata for the donation
            const donationMetadata = {
              amount: "0.01",
              amountWei: ethers.parseEther("0.01").toString(),
              donor: userAddress,
              description: "Donation to become a stakeholder",
              timestamp,
              transactionHash: tx.hash,
              blockNumber: receipt.blockNumber.toString(),
              blockHash: receipt.blockHash,
              gasUsed: receipt.gasUsed.toString()
            };
            
            // Find the DonationReceived event to get the donation ID
            const donationEvent = receipt.logs
              .map((log: any) => {
                try {
                  return platformContract.interface.parseLog({ 
                    topics: log.topics, 
                    data: log.data 
                  });
                } catch (e) {
                  return null;
                }
              })
              .filter((event: any) => event && event.name === 'DonationReceived')
              .pop();
              
            const donationId = donationEvent ? 
              donationEvent.args[0].toString() : 
              Date.now().toString(); // Fallback if we can't get the ID
              
            console.log(`Identified donation ID from event: ${donationId}`);
            
            // Upload to IPFS
            const ipfsHash = await uploadDonationToIPFS(
              donationId,
              "0.01",
              timestamp,
              userAddress,
              JSON.stringify(donationMetadata)
            );
            
            console.log("Donation metadata stored on IPFS with hash:", ipfsHash);
            // Save IPFS hash to localStorage
            saveDonationMetadata(tx.hash, ipfsHash);
          } catch (ipfsError: any) {
            console.error("Failed to upload donation metadata to IPFS:", ipfsError);
            // Don't block the UI flow if IPFS upload fails
          }
        }
        
        toast.success("Donation successful! You should now be a stakeholder.");
        
        // Refresh stakeholder status
        await checkUserRole();
      } catch (platformError) {
        console.error("Platform donation failed:", platformError);
        
        // Fall back to direct donation contract
        try {
          const donationContract = await getDonationTrackingContract(provider);
          const donationWithSigner = donationContract.connect(signer);
          
          // Cast to any to avoid TypeScript errors with the donate method
          const tx = await (donationWithSigner as any).donate(userAddress, {
            value: ethers.parseEther("0.01")
          });
          
          toast.info(`Direct donation transaction submitted: ${tx.hash.substring(0, 8)}...`);
          
          const receipt = await tx.wait();
          
          // After successful donation, upload metadata to IPFS
          if (receipt && receipt.status === 1) {
            try {
              const timestamp = new Date().toISOString();
              
              // Create metadata for the donation
              const donationMetadata = {
                amount: "0.01",
                amountWei: ethers.parseEther("0.01").toString(),
                donor: userAddress,
                description: "Direct donation to become a stakeholder",
                timestamp,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber.toString(),
                blockHash: receipt.blockHash,
                gasUsed: receipt.gasUsed.toString()
              };
              
              // For direct donations, use timestamp as ID since contract event may be different
              const donationId = Date.now().toString();
              
              // Upload to IPFS
              const ipfsHash = await uploadDonationToIPFS(
                donationId,
                "0.01",
                timestamp,
                userAddress,
                JSON.stringify(donationMetadata)
              );
              
              console.log("Direct donation metadata stored on IPFS with hash:", ipfsHash);
              // Save IPFS hash to localStorage
              saveDonationMetadata(tx.hash, ipfsHash);
            } catch (ipfsError: any) {
              console.error("Failed to upload direct donation metadata to IPFS:", ipfsError);
              // Don't block the UI flow if IPFS upload fails
            }
          }
          
          toast.success("Direct donation successful! You should now be a stakeholder.");
          
          // Refresh stakeholder status
          await checkUserRole();
        } catch (donationError) {
          console.error("Direct donation failed:", donationError);
          toast.error("All donation methods failed. See console for details.");
        }
      }
    } catch (error) {
      // Cast the error to any to access message property safely
      const err = error as { message?: string };
      console.error("Donation error:", error);
      toast.error("Failed to make donation: " + (err.message || "Unknown error"));
    }
  };

  // Display debug information
  const checkStakeholderStatus = async () => {
    try {
      toast.info("Checking stakeholder status from blockchain...");
      
      // Get all contract addresses
      await loadContractAddresses();
      
      const result = await checkUserRole();
      
      if (result) {
        if (result.isStakeholder) {
          toast.success(`Account ${result.address.substring(0, 6)}...${result.address.substring(38)} IS a stakeholder`);
        } else {
          toast.error(`Account ${result.address.substring(0, 6)}...${result.address.substring(38)} is NOT a stakeholder`);
        }
      }
    } catch (error) {
      console.error("Failed to check stakeholder status", error);
      toast.error("Failed to check stakeholder status");
    }
  };

  // Force reconnection to blockchain by clearing provider cache
  const resetConnection = async () => {
    try {
      toast.info("Reconnecting to blockchain...");
      
      // Clear any cached data
      setProposals([]);
      setVotedProposals({});
      setStakeholderInfo({status: false, checked: false});
      setError(null);
      setIsLoading(true);
      
      // Use the new resetProvider function
      await resetProvider();
      
      console.log("Provider reset completed, reloading data from blockchain");
      
      // Force a complete reload with a fresh provider
      try {
        // Use a fresh provider with forceNew=true
        const provider = await getProvider(true);
        
        // Force provider to refresh its data
        await provider.send("eth_blockNumber", []);
        
        // Clear MetaMask connection cache 
        if (window.ethereum) {
          await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
        }
        
        // Increment counter to trigger useEffect
        setForceReconnect(prev => prev + 1);
        
        toast.success("Reconnected to blockchain! Loading fresh data...");
      } catch (innerError) {
        console.error("Error refreshing provider:", innerError);
        toast.error("Connection reset but failed to refresh data");
      }
    } catch (error) {
      console.error("Failed to reset connection:", error);
      toast.error("Failed to reset connection");
    } finally {
      setIsLoading(false);
    }
  };

  // Force hard reload from blockchain
  const hardReloadFromBlockchain = async () => {
    try {
      toast.info("Performing hard reload from blockchain...");
      setIsLoading(true);
      
      // Clear all state
      setProposals([]);
      setVotedProposals({});
      setStakeholderInfo({status: false, checked: false});
      setExpandedId(null);
      setError(null);
      
      // Reset provider connection
      if (window.ethereum) {
        console.log("Requesting fresh account access");
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      }
      
      // Clear any cached provider
      const provider = await getProvider(true);
      console.log("Getting clean provider instance");
      
      // Load contract addresses directly
      const { 
        PROPOSAL_MANAGEMENT,
        DONATION_TRACKING, 
        VOTING_GOVERNANCE, 
        FUND_ALLOCATION, 
        CHARITY_DAO_PLATFORM 
      } = await import('../config/contracts');
      
      console.log("Loading contracts with addresses:", {
        PROPOSAL_MANAGEMENT,
        DONATION_TRACKING,
        VOTING_GOVERNANCE,
        FUND_ALLOCATION,
        CHARITY_DAO_PLATFORM
      });
      
      // Create a fresh contract instance 
      const ProposalManagementABI = await import('../contracts/ProposalManagement.json');
      const proposalContract = new ethers.Contract(
        PROPOSAL_MANAGEMENT,
        ProposalManagementABI.abi,
        provider
      );
      
      console.log("Created fresh contract instance at", proposalContract.target);
      
      // Force provider to refresh its data
      await provider.send("eth_blockNumber", []);
      
      // Get proposals directly
      console.log("Fetching proposals directly from blockchain");
      const rawProposals = await proposalContract.getAllProposals();
      console.log("Raw proposals fetched:", rawProposals);
      
      if (rawProposals && Array.isArray(rawProposals)) {
        // Format proposals - copy existing formatting logic
        const formattedProposals = rawProposals.map((proposal, index) => {
          let amountStr = "0.1"; // Default fallback
          if (proposal.amountRequested) {
            try {
              const amountBigInt = typeof proposal.amountRequested === 'bigint' 
                ? proposal.amountRequested 
                : BigInt(proposal.amountRequested.toString());
              
              if (amountBigInt > 0n) {
                amountStr = ethers.formatEther(amountBigInt);
              }
            } catch (error) {
              console.error('Error formatting amount:', error);
            }
          }
          
          // Get vote count
          const voteCount = Number(proposal.voteCount || 0);
          
          // Extract voting end time if available or set a test value
          // For testing, set the voting end time to 3 minutes from now for active proposals
          const now = Math.floor(Date.now() / 1000);
          let votingEndTime;
          
          if (proposal.votingEndTime) {
            // Use the actual value if available
            votingEndTime = Number(proposal.votingEndTime);
          } else if (!proposal.approved && !proposal.executed) {
            // For active proposals, simulate 3 minutes from now
            votingEndTime = now + 180;
          } else {
            // For approved/executed proposals, set to a past time
            votingEndTime = now - 60;
          }
          
          return {
            id: index + 1, // Use 1-based indexing to match contract
            description: proposal.description || '',
            amount: amountStr,
            recipient: proposal.recipient || '',
            votesFor: voteCount,
            votesAgainst: 0, // Not tracked separately in contract
            status: getProposalStatus(voteCount, proposal.approved || false, proposal.executed || false, votingEndTime),
            approved: proposal.approved || false,
            executed: proposal.executed || false,
            votingEndTime: votingEndTime
          };
        });
        
        console.log("Formatted proposals:", formattedProposals);
        setProposals(formattedProposals);
        
        // Now load stakeholder info with fresh connection
        await checkUserRole();
        
        toast.success("Successfully loaded fresh data from blockchain!");
      } else {
        console.log("No proposals found or invalid data returned");
        setProposals([]);
        toast.warning("No proposals found on the blockchain");
      }
      
      // Update connection state
      setForceReconnect(prev => prev + 1);
      
    } catch (error) {
      console.error("Hard refresh failed:", error);
      toast.error("Failed to load fresh data from blockchain");
      setError("Failed to load data directly from blockchain");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-2"><p className="text-gray-500">Loading proposals...</p></div>;
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="bg-white rounded shadow-sm">
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <h2 className="text-xl font-bold mb-2 md:mb-0">Active Proposals</h2>
            
            <div className="flex items-center">
              <button 
                onClick={checkStakeholderStatus}
                className="text-blue-500 text-sm flex items-center mr-3"
              >
                Check Status
              </button>
              <button 
                onClick={makeDonation}
                className="text-green-500 text-sm flex items-center mr-3"
              >
                Donate (0.01 ETH)
              </button>
              <button 
                onClick={loadProposals} 
                className="text-blue-500 text-sm flex items-center"
              >
                Refresh
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {stakeholderInfo.checked && (
          <div className={`p-2 text-center text-sm font-medium ${stakeholderInfo.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isOwner ? 
              'You are the contract owner ✓ You have full administrative rights' : 
              stakeholderInfo.status ? 
                'You are a stakeholder ✓ You can vote on proposals' : 
                <>
                  You are NOT a stakeholder ✗ <button onClick={makeDonation} className="underline">Click here to donate</button> to become a stakeholder
                </>
            }
          </div>
        )}

        {/* Add search input for filtering proposals by recipient address */}
        <div className="p-4 border-b">
          <div className="relative">
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="Search proposals by recipient address"
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
          {filteredProposals.length === 0 && searchAddress && (
            <p className="text-gray-500 text-sm mt-2">No proposals found with this recipient address.</p>
          )}
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 mx-4 rounded text-sm my-2">
            {error}
          </div>
        )}

        <div className="p-4 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700 mb-1">No proposals found</h3>
              <p className="text-sm text-gray-500 mb-4">New proposals will appear here when created</p>
              <button
                onClick={() => loadProposals()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine which proposals to display
  const displayedProposals = showAll ? filteredProposals : filteredProposals.slice(0, 2);

  return (
    <div className="bg-white rounded shadow-sm">
      <div className="p-4 border-b">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <h2 className="text-xl font-bold mb-2 md:mb-0">Active Proposals</h2>
          
          <div className="flex items-center">
            <button 
              onClick={checkStakeholderStatus}
              className="text-blue-500 text-sm flex items-center mr-3"
            >
              Check Status
            </button>
            <button 
              onClick={makeDonation}
              className="text-green-500 text-sm flex items-center mr-3"
            >
              Donate (0.01 ETH)
            </button>
            <button 
              onClick={loadProposals} 
              className="text-blue-500 text-sm flex items-center"
            >
              Refresh
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {stakeholderInfo.checked && (
        <div className={`p-2 text-center text-sm font-medium ${stakeholderInfo.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {isOwner ? 
            'You are the contract owner ✓ You have full administrative rights' : 
            stakeholderInfo.status ? 
              'You are a stakeholder ✓ You can vote on proposals' : 
              <>
                You are NOT a stakeholder ✗ <button onClick={makeDonation} className="underline">Click here to donate</button> to become a stakeholder
              </>
          }
        </div>
      )}
      
      {/* Add search input for filtering proposals by recipient address */}
      <div className="p-4 border-b">
        <div className="relative">
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            placeholder="Search proposals by recipient address"
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
        {filteredProposals.length === 0 && searchAddress && (
          <p className="text-gray-500 text-sm mt-2">No proposals found with this recipient address.</p>
        )}
      </div>

      {Object.keys(contractAddresses).length > 0 && (
        <div className="p-2 mb-2 bg-gray-50">
          <details>
            <summary className="text-xs text-gray-500 cursor-pointer">Contract Addresses (click to expand)</summary>
            <div className="mt-1 text-xs text-gray-600">
              {Object.entries(contractAddresses).map(([name, address]) => (
                <div key={name} className="flex justify-between mb-1">
                  <span>{name}:</span>
                  <span className="font-mono">{address}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 mx-4 rounded text-sm my-2">
          {error}
        </div>
      )}
    
      <div className="p-4 space-y-4">
        {displayedProposals.length > 0 ? (
          displayedProposals.map((proposal) => (
            <div key={proposal.id} className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 cursor-pointer" onClick={() => toggleExpand(proposal.id)}>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">{proposal.description}</h3>
                  <button>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d={expandedId === proposal.id ? 
                        "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" :
                        "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      } clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="text-sm text-gray-600 mt-1 flex justify-between items-center">
                  <span>Amount: {proposal.amount} ETH</span>
                  <div className="flex items-center">
                    <div className="bg-gray-200 h-2 rounded-full w-16 overflow-hidden mr-2">
                      <div 
                        className="bg-purple-500 h-full" 
                        style={{ width: `${Math.min(100, (proposal.votesFor / 3) * 100)}%` }}
                      ></div>
                    </div>
                    <span>{proposal.votesFor}/3</span>
                  </div>
                </div>
                
                {/* Time lock display */}
                {proposal.votingEndTime && !proposal.approved && !proposal.executed && (
                  <div className="bg-gray-50 p-2 rounded-md mb-3 text-sm">
                    <div className="flex items-center text-gray-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {Date.now() > proposal.votingEndTime * 1000 ? (
                        <span>Voting period has ended</span>
                      ) : (
                        <span>
                          Voting ends in: <TimeCountdown endTime={proposal.votingEndTime} />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {expandedId === proposal.id && (
                <div className="px-4 pb-4 border-t border-gray-200 pt-3">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm text-gray-500">Recipient</h4>
                      <div className="flex items-center mt-1">
                        <code className="bg-gray-100 p-2 rounded text-sm flex-grow overflow-auto">
                          {proposal.recipient}
                        </code>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-500">Amount Requested</h4>
                      <p className="text-blue-500 text-xl font-medium mt-1">{proposal.amount} ETH</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-500">Status</h4>
                      <div className="mt-1">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          proposal.executed ? "bg-green-100 text-green-800" : 
                          proposal.approved ? "bg-blue-100 text-blue-800" : 
                          proposal.votesFor >= 3 ? "bg-orange-100 text-orange-800" : 
                          proposal.votingEndTime && Date.now() > proposal.votingEndTime * 1000 ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {proposal.status}
                        </span>
                        
                        {proposal.votingEndTime && !proposal.approved && !proposal.executed && (
                          <div className="mt-2 text-sm">
                            {Date.now() > proposal.votingEndTime * 1000 ? (
                              <span className="text-red-600">Voting period ended</span>
                            ) : (
                              <span className="text-green-600">
                                Voting ends in {Math.max(0, Math.floor((proposal.votingEndTime * 1000 - Date.now()) / 1000))} seconds
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-500">Votes</h4>
                      <div className="mt-1 flex items-center">
                        <div className="bg-gray-200 h-2 rounded-full w-full max-w-[120px] overflow-hidden">
                          <div 
                            className="bg-purple-500 h-full" 
                            style={{ width: `${Math.min(100, (proposal.votesFor / 3) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm ml-2 font-medium">{proposal.votesFor} of 3 votes</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      {/* Vote button for stakeholders (not owner) - show "Voted!" status if already voted */}
                      {isStakeholder && !isOwner && !proposal.approved && !proposal.executed && (
                        proposal.votingEndTime && Date.now() > proposal.votingEndTime * 1000 ? (
                          <div className="bg-red-100 text-red-700 px-8 py-2 rounded-lg text-sm font-medium">
                            Voting Period Ended
                          </div>
                        ) : (
                          hasVoted(proposal.id) ? (
                            <div className="flex items-center space-x-2">
                              <div className="bg-purple-100 text-purple-700 px-8 py-2 rounded-lg text-sm font-medium flex items-center">
                                <span>Voted!</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  checkVotedProposalsDirectly();
                                  toast.info("Refreshing vote status...");
                                }}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm"
                              >
                                Refresh
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVote(proposal.id);
                                }}
                                className={`bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-medium ${votingProposal === proposal.id ? 'opacity-70 cursor-wait' : ''}`}
                                disabled={votingProposal === proposal.id}
                              >
                                {votingProposal === proposal.id ? 'Voting...' : 'Vote'}
                              </button>
                            </div>
                          )
                        )
                      )}
                      
                      {/* Approve button for owner when votes reach 3 */}
                      {isOwner && proposal.votesFor >= 3 && !proposal.approved && !proposal.executed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(proposal.id);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg text-sm font-medium"
                        >
                          Approve
                        </button>
                      )}
                      
                      {/* Execute button for owner after proposal is approved */}
                      {isOwner && proposal.approved && !proposal.executed && (
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExecute(proposal.id, proposal.recipient, proposal.amount);
                            }}
                            className={`bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg text-sm font-medium ${executingProposal === proposal.id ? 'opacity-70 cursor-wait' : ''}`}
                            disabled={executingProposal === proposal.id}
                          >
                            {executingProposal === proposal.id ? 'Executing...' : 'Execute'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700 mb-1">No proposals found</h3>
              <p className="text-sm text-gray-500 mb-4">New proposals will appear here when created</p>
              {isStakeholder && (
                <button
                  onClick={() => loadProposals()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Refresh
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {proposals.length > 2 && (
        <div className="text-center py-4 border-t">
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

export default ProposalList; 