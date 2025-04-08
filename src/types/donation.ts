export interface Donation {
  id: number;
  donor: string;
  amount: string;
  timestamp: bigint | string;
  transactionHash: string;
  metadataHash?: string;
  description?: string;
}

export interface DonationMetadata {
  donor: string;
  amount: string;
  timestamp: string;
  description?: string;
  transactionHash: string;
}
