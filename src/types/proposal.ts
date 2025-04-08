export interface ProposalMetadata {
  id: string;
  description: string;
  amountRequested: string;
  recipient: string;
  createdAt: string;
  createdBy: string;
  status: {
    voteCount: string;
    approved: boolean;
    executed: boolean;
    lastUpdated: string;
  };
  history: {
    timestamp: string;
    action: 'created' | 'voted' | 'approved' | 'executed';
    actor: string;
    details?: string;
  }[];
}

export interface Proposal {
  id: bigint;
  description: string;
  amountRequested: bigint;
  voteCount: bigint;
  approved: boolean;
  executed: boolean;
  recipient: string;
  votingEndTime: bigint;
  ipfsHash?: string;
}

export interface ProposalWithMetadata extends Proposal {
  metadata?: ProposalMetadata;
  votingEndTime: bigint;
}