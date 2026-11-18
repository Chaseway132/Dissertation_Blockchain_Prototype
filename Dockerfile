FROM node:18-alpine

# Install build dependencies and wget for the JSON-RPC readiness check.
RUN apk add --no-cache python3 make g++ wget bash

WORKDIR /app

# Install root dependencies (Hardhat, Ganache, and plugins).
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

RUN mkdir -p ./cache ./artifacts \
    && touch ./deployedAddresses.json ./charity-dao-frontend/src/contracts/deployedAddresses.ts \
    && chmod +x ./start-node.sh \
    && chown node:node ./start-node.sh ./deployedAddresses.json ./charity-dao-frontend/src/contracts/deployedAddresses.ts \
    && chown -R node:node ./cache ./artifacts

USER node

EXPOSE 8545

CMD ["./start-node.sh"]
