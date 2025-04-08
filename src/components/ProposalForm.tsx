import React, { useState } from 'react';
import { parseEther, Contract } from 'ethers';
import { toast } from 'react-hot-toast';
import { getContracts } from '../utils/contracts';
import { getProvider } from '../utils/provider';
import { uploadProposalToIPFS } from '../utils/ipfs';
import type { ProposalManagementContract } from '../utils/contracts';

const ProposalForm: React.FC = () => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdProposalId, setCreatedProposalId] = useState<string | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !recipient) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate recipient address
    if (recipient === '0x0000000000000000000000000000000000000000' || !recipient.startsWith('0x') || recipient.length !== 42) {
      toast.error('Please enter a valid recipient address');
      return;
    }

    try {
      setIsLoading(true);
      
      // Get the provider and contract instance
      const provider = await getProvider();
      const { charityDAOPlatform } = await getContracts(provider);
      
      // Get the signer and address
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Connect the contract with the signer
      const contractWithSigner = charityDAOPlatform.connect(signer);
      
      // Convert amount to Wei
      const amountInWei = parseEther(amount);

      // Create proposal metadata for IPFS
      const formatTimestamp = (date: Date) => {
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      };

      const currentTime = new Date();
      const formattedTime = formatTimestamp(currentTime);

      const proposalMetadata = {
        description,
        amountRequested: amount,
        recipient,
        createdAt: formattedTime,
        createdBy: userAddress,
        status: {
          voteCount: '0',
          approved: false,
          executed: false,
          lastUpdated: formattedTime
        },
        history: [{
          timestamp: formattedTime,
          action: 'created',
          actor: userAddress,
          details: `Proposal created requesting ${amount} ETH`
        }]
      };
      
      console.log('Proposal metadata:', proposalMetadata);
      console.log('Uploading metadata to IPFS...');
      
      // Upload metadata to IPFS
      const ipfsHash = await uploadProposalToIPFS(
        Date.now().toString(), // temporary ID until we get the real one
        amount,
        proposalMetadata.createdAt,
        recipient,
        JSON.stringify(proposalMetadata)
      );
      
      console.log('IPFS Hash received:', ipfsHash);
      
      // Create proposal
      console.log('Creating proposal with:', {
        description,
        amountInWei: amountInWei.toString(),
        recipient
      });
      
      const tx = await contractWithSigner.createProposal(
        description,
        amountInWei,
        recipient
      );
      
      console.log('Transaction submitted:', tx.hash);
      toast.success('Proposal creation submitted! Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      
      // Store the created proposal ID and IPFS hash
      setCreatedProposalId(tx.hash);
      setIpfsHash(ipfsHash);
      
      // Reset form
      setDescription('');
      setAmount('');
      setRecipient('');
      toast.success('Proposal created successfully!');
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      toast.error(error.message || 'Failed to create proposal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">      
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
            rows={4}
            required
          />
        </div>
        
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount (ETH)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
            step="0.000000000000000001"
            required
          />
        </div>
        
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
            Recipient Address
          </label>
          <input
            type="text"
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
            placeholder="0x..."
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Proposal'}
        </button>
      </form>

      {/* Success Message with IPFS Details */}
      {createdProposalId && ipfsHash && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-sm font-medium text-green-800">Proposal Created Successfully!</h3>
          <div className="mt-2 space-y-2">
            <div>
              <p className="text-sm text-green-700">Proposal ID:</p>
              <div className="flex items-center space-x-2">
                <code className="text-sm bg-white p-2 rounded border border-green-200 flex-1 break-all">
                  {createdProposalId}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdProposalId);
                    toast.success('Proposal ID copied to clipboard!');
                  }}
                  className="text-green-600 hover:text-green-700"
                  title="Copy Proposal ID"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm text-green-700">IPFS Hash:</p>
              <div className="flex items-center space-x-2">
                <code className="text-sm bg-white p-2 rounded border border-green-200 flex-1 break-all">
                  {ipfsHash}
                </code>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ipfsHash);
                      toast.success('IPFS hash copied to clipboard!');
                    }}
                    className="text-green-600 hover:text-green-700"
                    title="Copy IPFS Hash"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                  <a
                    href={`https://ipfs.io/ipfs/${ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700"
                    title="View on IPFS"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Click the external link icon to view the data on IPFS</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalForm; 