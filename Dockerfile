FROM node:18-alpine

# Install build dependencies and wget for the JSON-RPC readiness check.
RUN apk add --no-cache python3 make g++ wget bash

WORKDIR /app

# Install root dependencies (Hardhat and plugins).
COPY package*.json ./
RUN npm ci

# Copy contracts, Hardhat config, and deployment scripts.
COPY contracts/ ./contracts/
COPY hardhat.config.js ./
COPY charity-dao-contracts/ ./charity-dao-contracts/
COPY start-node.sh ./
RUN mkdir -p /app/charity-dao-frontend/src/contracts

# Pre-compile contracts so startup is fast.
RUN npx hardhat compile

RUN chmod +x ./start-node.sh

EXPOSE 8545

CMD ["./start-node.sh"]
