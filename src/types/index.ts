export interface Donation {
  id: number;
  donor: string;
  amount: string;
  timestamp: string;
  metadataHash?: string;
  transactionHash?: string;
}

export interface RawDonation {
  id: bigint;
  donor: string;
  amount: bigint;
  timestamp: bigint;
  metadataHash?: string;
}

export interface Proposal {
  id: number;
  title: string;
  description: string;
  amount: string;
  creator: string;
  timestamp: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
}