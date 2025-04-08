import axios from 'axios';
import { Buffer } from 'buffer';

// Pinata configuration
// In React client, environment variables must be prefixed with REACT_APP_
// Access directly from window to debug any issues
const PINATA_JWT = process.env.REACT_APP_PINATA_JWT || '';
console.log('IPFS Module - Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PINATA_JWT available:', PINATA_JWT ? 'Yes' : 'No');
console.log('PINATA_JWT length:', PINATA_JWT ? PINATA_JWT.length : 0);

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// Multiple IPFS gateways for redundancy
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.ipfs.io/ipfs/'
];

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const uploadWithRetry = async (data: any): Promise<any> => {
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt} of ${MAX_RETRIES} to upload to Pinata...`);
      
      const response = await axios({
        method: 'post',
        url: PINATA_API_URL,
        data: data,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`
        },
        timeout: 30000 // 30 second timeout
      });

      return response;
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        console.log(`Waiting ${RETRY_DELAY/1000} seconds before retry...`);
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  throw lastError;
};

export const testIPFSConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing IPFS connection with JWT:', PINATA_JWT ? 'Present' : 'Missing');
    
    if (!PINATA_JWT) {
      console.error('PINATA_JWT is missing or undefined');
      return false;
    }
    
    console.log('JWT length:', PINATA_JWT.length);
    console.log('JWT first 20 chars:', PINATA_JWT.substring(0, 20) + '...');
    
    // Test Pinata connection by getting pin list
    console.log('Attempting to connect to Pinata API...');
    const response = await axios.get('https://api.pinata.cloud/data/pinList', {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000, // 30 second timeout
      validateStatus: (status) => status < 500 // Don't reject if status < 500
    });

    console.log('Pinata API response status:', response.status);
    
    if (response.status === 401) {
      console.error('Pinata authentication failed - invalid JWT token');
      return false;
    }

    if (response.status !== 200) {
      console.error('Pinata API returned unexpected status:', response.status);
      return false;
    }

    console.log('Successfully connected to Pinata', response.data);
    return true;
  } catch (error: any) {
    console.error('Pinata connection test failed:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      isTimeout: error.code === 'ECONNABORTED'
    });

    // More specific error messages
    if (error.code === 'ECONNABORTED') {
      console.error('Connection to Pinata timed out. Please check your internet connection or try again later.');
    } else if (error.response?.status === 401) {
      console.error('Invalid Pinata JWT token. Please check your configuration.');
    } else if (!PINATA_JWT) {
      console.error('Pinata JWT token is missing. Please check your environment variables.');
    }

    return false;
  }
};

export const uploadDonationToIPFS = async (
  id: string,
  amount: string,
  timestamp: string,
  recipient: string,
  metadata: string
): Promise<string> => {
  try {
    console.log('PINATA_JWT status:', PINATA_JWT ? 'Present' : 'Missing');

    if (!PINATA_JWT) {
      throw new Error('Pinata JWT token not configured');
    }

    const data = {
      pinataOptions: {
        cidVersion: 1
      },
      pinataMetadata: {
        name: `Donation-${id}`,
        keyvalues: {
          donationId: id,
          timestamp: timestamp
        }
      },
      pinataContent: JSON.parse(metadata)
    };

    const response = await uploadWithRetry(data);
    
    console.log('Successfully uploaded to Pinata:', {
      status: response.status,
      ipfsHash: response.data.IpfsHash,
      timestamp: response.data.Timestamp
    });

    return response.data.IpfsHash;
  } catch (error: any) {
    console.error('Error uploading to Pinata after all retries:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const uploadProposalToIPFS = async (
  proposalId: string,
  amountRequested: string,
  timestamp: string,
  recipient: string,
  metadata: string
): Promise<string> => {
  try {
    console.log('Uploading proposal metadata to IPFS - Start');
    console.log('Parameters:', { proposalId, amountRequested, timestamp, recipient });
    console.log('Metadata size:', metadata.length, 'bytes');

    if (!PINATA_JWT) {
      throw new Error('Pinata JWT token not configured');
    }

    const data = {
      pinataOptions: {
        cidVersion: 1
      },
      pinataMetadata: {
        name: `Proposal-${proposalId}-${timestamp}`,
        keyvalues: {
          proposalId,
          amountRequested,
          timestamp,
          recipient,
          type: 'proposal'
        }
      },
      pinataContent: JSON.parse(metadata)
    };

    console.log('Using uploadWithRetry for proposal data');
    const response = await uploadWithRetry(data);
    
    console.log('Successfully uploaded proposal to Pinata:', {
      status: response.status,
      ipfsHash: response.data.IpfsHash,
      timestamp: response.data.Timestamp
    });

    return response.data.IpfsHash;
  } catch (error: any) {
    console.error('Error uploading proposal to IPFS:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const uploadVoteToIPFS = async (
  proposalId: string,
  voterAddress: string,
  timestamp: string,
  metadata: string
): Promise<string> => {
  try {
    console.log('Uploading vote metadata to IPFS:', metadata);

    if (!PINATA_JWT) {
      throw new Error('Pinata JWT token not configured');
    }

    const data = {
      pinataOptions: {
        cidVersion: 1
      },
      pinataMetadata: {
        name: `Vote-${proposalId}-${voterAddress.substring(0, 8)}`,
        keyvalues: {
          proposalId,
          voterAddress,
          timestamp,
          type: 'vote'
        }
      },
      pinataContent: JSON.parse(metadata)
    };

    const response = await uploadWithRetry(data);
    
    console.log('Successfully uploaded vote to Pinata:', {
      status: response.status,
      ipfsHash: response.data.IpfsHash,
      timestamp: response.data.Timestamp
    });

    return response.data.IpfsHash;
  } catch (error: any) {
    console.error('Error uploading vote to IPFS:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const uploadExecutionToIPFS = async (
  proposalId: string,
  executorAddress: string,
  recipient: string,
  amount: string,
  timestamp: string,
  txHash: string,
  metadata: string
): Promise<string> => {
  try {
    console.log('Uploading execution metadata to IPFS:', metadata);

    if (!PINATA_JWT) {
      throw new Error('Pinata JWT token not configured');
    }

    const data = {
      pinataOptions: {
        cidVersion: 1
      },
      pinataMetadata: {
        name: `Execution-${proposalId}`,
        keyvalues: {
          proposalId,
          executorAddress,
          recipient,
          amount,
          timestamp,
          txHash,
          type: 'execution'
        }
      },
      pinataContent: JSON.parse(metadata)
    };

    const response = await uploadWithRetry(data);
    
    console.log('Successfully uploaded execution to Pinata:', {
      status: response.status,
      ipfsHash: response.data.IpfsHash,
      timestamp: response.data.Timestamp
    });

    return response.data.IpfsHash;
  } catch (error: any) {
    console.error('Error uploading execution to IPFS:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const uploadApprovalToIPFS = async (
  proposalId: string,
  approverAddress: string,
  timestamp: string,
  metadata: string
): Promise<string> => {
  try {
    console.log('Uploading approval metadata to IPFS:', metadata);

    if (!PINATA_JWT) {
      throw new Error('Pinata JWT token not configured');
    }

    const data = {
      pinataOptions: {
        cidVersion: 1
      },
      pinataMetadata: {
        name: `Approval-${proposalId}-${approverAddress.substring(0, 8)}`,
        keyvalues: {
          proposalId,
          approverAddress,
          timestamp,
          type: 'approval'
        }
      },
      pinataContent: JSON.parse(metadata)
    };

    const response = await uploadWithRetry(data);
    
    console.log('Successfully uploaded approval to Pinata:', {
      status: response.status,
      ipfsHash: response.data.IpfsHash,
      timestamp: response.data.Timestamp
    });

    return response.data.IpfsHash;
  } catch (error: any) {
    console.error('Error uploading approval to IPFS:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const getFromIPFS = async (cid: string): Promise<any> => {
  if (!cid) return null;
  
  let lastError = null;

  // Try each gateway in sequence
  for (const gateway of IPFS_GATEWAYS) {
    try {
      console.log(`Trying IPFS gateway: ${gateway}`);
      const response = await axios.get(`${gateway}${cid}`, {
        timeout: 5000 // 5 second timeout per gateway
      });
      console.log(`Successfully retrieved from ${gateway}`);
      return response.data;
    } catch (error: any) {
      console.log(`Gateway ${gateway} failed:`, error.message);
      lastError = error;
      continue; // Try next gateway
    }
  }

  // If we have Pinata credentials, try as last resort with authentication
  if (PINATA_JWT) {
    try {
      const response = await axios.get(`${PINATA_GATEWAY}${cid}`, {
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`
        },
        timeout: 5000
      });
      return response.data;
    } catch (error: any) {
      lastError = error;
    }
  }

  console.error('All IPFS gateways failed:', lastError);
  throw new Error('Failed to retrieve IPFS content from all available gateways');
};