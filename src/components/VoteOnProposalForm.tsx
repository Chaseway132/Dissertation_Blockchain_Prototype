import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { getContractWithSigner } from '../utils/contractHelpers';
import { VOTING_GOVERNANCE } from '../utils/contracts';
import { VotingGovernanceABI_Interface } from '../utils/abiUtils';
import { checkAndSwitchNetwork } from '../utils/provider';

interface VoteOnProposalFormProps {
  proposalId: number;
  onVoteSuccess?: () => void;
}

const VoteOnProposalForm: React.FC<VoteOnProposalFormProps> = ({ proposalId, onVoteSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async (support: boolean) => {
    try {
      setIsLoading(true);
      
      // Check and switch network if needed
      await checkAndSwitchNetwork();
      
      // Get contract instance with signer
      const votingContract = await getContractWithSigner(
        VOTING_GOVERNANCE,
        VotingGovernanceABI_Interface
      );
      
      // Cast vote
      const tx = await votingContract.castVote(proposalId, support);
      await tx.wait();
      
      toast.success(`Vote cast successfully! You voted ${support ? 'for' : 'against'} the proposal.`);
      
      // Call success callback if provided
      if (onVoteSuccess) {
        onVoteSuccess();
      }
    } catch (error: any) {
      console.error('Error casting vote:', error);
      toast.error(error.message || 'Failed to cast vote');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex space-x-4">
      <button
        onClick={() => handleVote(true)}
        disabled={isLoading}
        className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : 'Vote For'}
      </button>
      
      <button
        onClick={() => handleVote(false)}
        disabled={isLoading}
        className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : 'Vote Against'}
      </button>
    </div>
  );
};

export default VoteOnProposalForm; 