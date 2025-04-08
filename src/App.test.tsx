import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock the dependencies
jest.mock('./utils/contracts', () => ({
  getContracts: jest.fn().mockResolvedValue({
    charityDAOPlatform: {
      target: '0x32f15DCD39AEA5c23c9ea01f84Cca08ccbB1534E'
    },
    fundAllocation: {
      target: '0x2E31459CB46CEEBd6815c715e7e07D77fc21c58D'
    }
  })
}));

jest.mock('./utils/provider', () => ({
  getProvider: jest.fn().mockResolvedValue({
    getBalance: jest.fn().mockResolvedValue(BigInt(1000000000000000000)) // 1 ETH
  })
}));

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders app title', () => {
    render(<App />);
    expect(screen.getByText(/Charity DAO/i)).toBeInTheDocument();
  });

  test('loads contract balances', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Platform Balance:')).toBeInTheDocument();
      expect(screen.getByText('Fund Balance:')).toBeInTheDocument();
    });
  });

  test('displays correct contract addresses', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/0x32f15DCD39AEA5c23c9ea01f84Cca08ccbB1534E/i)).toBeInTheDocument();
      expect(screen.getByText(/0x2E31459CB46CEEBd6815c715e7e07D77fc21c58D/i)).toBeInTheDocument();
    });
  });
}); 