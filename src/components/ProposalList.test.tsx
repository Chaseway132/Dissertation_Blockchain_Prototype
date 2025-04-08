import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProposalList from './ProposalList';

// Mock the dependencies
jest.mock('../utils/contracts', () => ({
  getContracts: jest.fn().mockResolvedValue({
    charityDAOPlatform: {
      getAllProposals: jest.fn().mockResolvedValue([
        {
          id: BigInt(1),
          description: 'Test Proposal 1',
          amountRequested: BigInt(1000000000000000000), // 1 ETH
          voteCount: BigInt(2),
          approved: false,
          executed: false,
          recipient: '0x1234567890123456789012345678901234567890',
          votingEndTime: BigInt(Math.floor(Date.now() / 1000) + 86400) // 24 hours from now
        },
        {
          id: BigInt(2),
          description: 'Test Proposal 2',
          amountRequested: BigInt(2000000000000000000), // 2 ETH
          voteCount: BigInt(3),
          approved: true,
          executed: false,
          recipient: '0x0987654321098765432109876543210987654321',
          votingEndTime: BigInt(Math.floor(Date.now() / 1000) + 86400) // 24 hours from now
        }
      ]),
      voteOnProposal: jest.fn().mockResolvedValue({
        hash: '0x1234567890abcdef',
        wait: jest.fn().mockResolvedValue({ status: 1 })
      }),
      approveProposal: jest.fn().mockResolvedValue({
        hash: '0x1234567890abcdef',
        wait: jest.fn().mockResolvedValue({ status: 1 })
      }),
      executeProposal: jest.fn().mockResolvedValue({
        hash: '0x1234567890abcdef',
        wait: jest.fn().mockResolvedValue({ status: 1 })
      }),
      owner: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      target: '0x32f15DCD39AEA5c23c9ea01f84Cca08ccbB1534E'
    },
    fundAllocation: {
      target: '0x2E31459CB46CEEBd6815c715e7e07D77fc21c58D'
    }
  })
}));

jest.mock('../utils/provider', () => ({
  getProvider: jest.fn().mockResolvedValue({
    getSigner: jest.fn().mockResolvedValue({
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
    }),
    getBalance: jest.fn().mockResolvedValue(BigInt(1000000000000000000)) // 1 ETH
  })
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

describe('ProposalList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders proposal list', async () => {
    render(<ProposalList />);
    
    // Wait for proposals to load
    await waitFor(() => {
      expect(screen.getByText('Test Proposal 1')).toBeInTheDocument();
      expect(screen.getByText('Test Proposal 2')).toBeInTheDocument();
    });
    
    // Check if proposal details are displayed
    expect(screen.getByText('1.0 ETH')).toBeInTheDocument();
    expect(screen.getByText('2.0 ETH')).toBeInTheDocument();
  });

  test('displays correct vote counts', async () => {
    render(<ProposalList />);
    
    await waitFor(() => {
      expect(screen.getByText('2/3')).toBeInTheDocument();
      expect(screen.getByText('3/3')).toBeInTheDocument();
    });
  });

  test('shows correct proposal status', async () => {
    render(<ProposalList />);
    
    await waitFor(() => {
      // First proposal is not approved
      expect(screen.getByText('Pending')).toBeInTheDocument();
      
      // Second proposal is approved but not executed
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });
  });
}); 