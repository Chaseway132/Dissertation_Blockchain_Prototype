import React, { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getProvider } from '../utils/web3';
import { getProposalManagementContract } from '../utils/contracts';
import { uploadProposalToIPFS } from '../utils/ipfs';

interface CreateProposalFormProps {
  onProposalCreated?: () => void;
}

const CreateProposalForm: React.FC<CreateProposalFormProps> = ({ onProposalCreated }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount || !recipientAddress || parseFloat(amount) <= 0) {
      toast.error('Please fill in all fields with valid values');
      return;
    }

    // Validate recipient address
    if (!ethers.isAddress(recipientAddress)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    try {
      setIsLoading(true);
      
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Get contract instance
      const proposalContract = await getProposalManagementContract(provider);
      
      // Connect with signer
      const contractWithSigner = proposalContract.connect(signer);
      
      // Convert amount to wei (1 ETH = 10^18 wei)
      const amountInWei = ethers.parseEther(amount);
      
      // Normalize address to checksum format
      const checksumAddress = ethers.getAddress(recipientAddress);
      
      console.log('Creating proposal with parameters:', {
        description,
        amount: amountInWei.toString(),
        recipient: checksumAddress
      });
      
      // Generate metadata for IPFS
      const timestamp = new Date().toISOString();
      const proposalMetadata = {
        description,
        amountRequested: amount,
        amountRequestedWei: amountInWei.toString(),
        recipient: checksumAddress,
        creatorAddress: userAddress,
        timestamp,
        createdAt: timestamp
      };
      
      // Create proposal with the correct parameter order: description, amount, recipient
      const tx = await contractWithSigner.createProposal(
        description,
        amountInWei,
        checksumAddress
      );
      
      toast.info(`Transaction sent: ${tx.hash.substring(0, 10)}... (Check your wallet for status)`);
      const receipt = await tx.wait();
      
      // Upload proposal metadata to IPFS after successful transaction
      if (receipt && receipt.status === 1) {
        try {
          console.log("Starting IPFS upload process with uploadProposalToIPFS");
          
          // Update metadata with transaction details
          const enhancedMetadata = {
            ...proposalMetadata,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber.toString(),
            blockHash: receipt.blockHash,
            gasUsed: receipt.gasUsed.toString(),
            from: receipt.from
          };
          
          console.log("Enhanced metadata prepared:", JSON.stringify(enhancedMetadata).substring(0, 200) + "...");
          
          // Find the ProposalCreated event to get the actual proposal ID
          console.log("Parsing transaction logs to find ProposalCreated event...");
          console.log("Number of logs found:", receipt.logs.length);
          
          const proposalCreatedEvent = receipt.logs
            .map((log: any, index: number) => {
              try {
                console.log(`Parsing log ${index}:`, log.topics);
                const parsed = proposalContract.interface.parseLog({ 
                  topics: log.topics, 
                  data: log.data 
                });
                console.log(`Log ${index} parsed as:`, parsed?.name);
                return parsed;
              } catch (e: any) {
                console.log(`Failed to parse log ${index}:`, e.message);
                return null;
              }
            })
            .filter((event: any) => event && event.name === 'ProposalCreated')
            .pop();
          
          console.log("ProposalCreated event found:", proposalCreatedEvent ? "Yes" : "No");
          
          if (proposalCreatedEvent) {
            console.log("Event arguments:", proposalCreatedEvent.args);
          }
            
          const proposalId = proposalCreatedEvent ? 
            proposalCreatedEvent.args[0].toString() : 
            'unknown';
            
          console.log(`Identified proposal ID from event: ${proposalId}`);
          const finalMetadata = {
            ...enhancedMetadata,
            proposalId
          };
          
          console.log("Preparing IPFS upload with parameters:");
          console.log("- ProposalId:", proposalId);
          console.log("- Amount:", amount);
          console.log("- Timestamp:", timestamp);
          console.log("- Recipient:", checksumAddress);
          console.log("- Metadata size:", JSON.stringify(finalMetadata).length, "bytes");
          
          // Upload to IPFS
          const ipfsHash = await uploadProposalToIPFS(
            proposalId,
            amount,
            timestamp,
            checksumAddress,
            JSON.stringify(finalMetadata)
          );
          
          console.log("Proposal metadata stored on IPFS with hash:", ipfsHash);
        } catch (ipfsError: any) {
          console.error("Failed to upload proposal metadata to IPFS:", ipfsError);
          console.error("Error details:", {
            message: ipfsError.message,
            stack: ipfsError.stack,
            name: ipfsError.name
          });
          // Don't block the UI flow if IPFS upload fails
        }
      }
      
      toast.success('Proposal created successfully!');
      setDescription('');
      setAmount('');
      setRecipientAddress('');
      
      // Call success callback if provided
      if (onProposalCreated) {
        onProposalCreated();
      }
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      toast.error(error.message || 'Failed to create proposal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Describe your proposal"
          rows={4}
          required
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount (ETH)
        </label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="0.0"
          step="0.01"
          min="0"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
          Recipient Address
        </label>
        <input
          type="text"
          id="recipient"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="0x..."
          required
        />
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded"
        >
          {isLoading ? 'Creating...' : 'Create Proposal'}
        </button>
      </div>
    </form>
  );
};

export default CreateProposalForm; 