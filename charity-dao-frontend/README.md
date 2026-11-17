# Charity DAO Frontend

This is the frontend application for the Charity DAO project. It provides a user interface for interacting with the Charity DAO smart contracts.

## Features

- Connect to Web3 wallet (MetaMask)
- View and create proposals
- Vote on proposals
- Execute passed proposals
- View proposal details and voting status

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MetaMask or another Web3 wallet
- Local Ethereum network (e.g., Hardhat) or testnet

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory with the following variables:
```
REACT_APP_PROPOSAL_MANAGEMENT_ADDRESS=0x0000000000000000000000000000000000000000
REACT_APP_CHAIN_ID=1337
REACT_APP_RPC_URL=http://localhost:8545
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## Smart Contract Deployment

1. Deploy the smart contracts:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

2. Update the `.env` file with the deployed contract addresses.

## Testing

Run the test suite:
```bash
npm test
# or
yarn test
```

## Building for Production

Build the application for production:
```bash
npm run build
# or
yarn build
```

Serve the production build with `npm start`. The server binds to `0.0.0.0` and uses the `PORT` environment variable, defaulting to port 3000.

## License

This project is licensed under the MIT License.

## Directory Structure

```
charity-dao-frontend/
├── public/                 # Static files
├── src/
│   ├── components/        # React components
│   │   ├── DonationForm.tsx     # Donation submission form
│   │   ├── DonationList.tsx     # List of donations
│   │   ├── ProposalForm.tsx     # Proposal creation form
│   │   ├── ProposalList.tsx     # List of proposals
│   │   └── ...
│   ├── config/           # Contract configurations
│   ├── contracts/        # Contract ABIs
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main application component
│   └── index.tsx        # Application entry point
└── package.json         # Dependencies and scripts
```

## Key Components

### Donation Management
- `DonationForm.tsx`: Handles donation submission with IPFS metadata storage
- `DonationList.tsx`: Displays all donations with IPFS metadata

### Proposal System
- `ProposalForm.tsx`: Creates new proposals with metadata
- `ProposalList.tsx`: Shows active and past proposals
- `VoteOnProposalForm.tsx`: Handles voting functionality

### IPFS Integration
- All metadata is stored on IPFS via Pinata
- Each transaction (donation/proposal/vote) has associated IPFS metadata
- IPFS hashes are stored on-chain for verification

## Environment Variables

Required environment variables in `.env.local`:
```
REACT_APP_PINATA_JWT=your_pinata_jwt_here
```

## Available Scripts

- `npm start`: Runs the development server
- `npm test`: Runs the test suite
- `npm run build`: Builds for production
- `npm run generate-types`: Generates TypeScript types from contracts

## Development Guidelines

1. Use TypeScript for all new components
2. Follow the existing component structure
3. Implement error handling for all blockchain interactions
4. Add appropriate loading states for async operations
5. Document any new components or utilities
6. Test all components before submitting changes

## Testing

The application includes unit tests for components and integration tests for contract interactions. Run tests with:

```bash
npm test
```

## Styling

- Uses Tailwind CSS for styling
- Follows a consistent design system
- Responsive design for all screen sizes

## Error Handling

The application implements comprehensive error handling for:
- Failed transactions
- Network issues
- Invalid input
- MetaMask connection problems
- IPFS upload failures

## Performance Considerations

- Implements lazy loading for large lists
- Caches IPFS metadata when possible
- Minimizes blockchain calls
- Uses React.memo for expensive components
