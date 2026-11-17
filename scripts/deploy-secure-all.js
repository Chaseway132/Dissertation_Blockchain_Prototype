// scripts/deploy-secure-all.js
//
// ONE script that deploys the whole Charity DAO using SecureFundAllocation
// (reentrancy-protected) from the start, links every contract to the right
// neighbours, checks the links, and writes the addresses the frontend reads.
//
// Run (Ganache must be open):
//   npx hardhat run scripts/deploy-secure-all.js --network ganache

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function waitFor(txPromise, label) {
  const tx = await txPromise;
  await tx.wait();
  console.log("  done:", label);
}

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const secondSigner = signers[1]; // needed: proposals require 2 signatures

  console.log("=== Deploying Charity DAO (secure version) ===");
  console.log("Deployer:", deployer.address);

  // 1. Deploy contracts, in dependency order
  console.log("\n[1/4] Deploying contracts...");

  const ProposalManagement = await ethers.getContractFactory("ProposalManagement");
  const proposalManagement = await ProposalManagement.deploy();
  await proposalManagement.waitForDeployment();
  const pmAddr = await proposalManagement.getAddress();
  console.log("  ProposalManagement :", pmAddr);

  const SecureFundAllocation = await ethers.getContractFactory("SecureFundAllocation");
  const secureFund = await SecureFundAllocation.deploy(pmAddr);
  await secureFund.waitForDeployment();
  const fundAddr = await secureFund.getAddress();
  console.log("  SecureFundAllocation:", fundAddr);

  const DonationTracking = await ethers.getContractFactory("DonationTracking");
  const donationTracking = await DonationTracking.deploy(fundAddr);
  await donationTracking.waitForDeployment();
  const dtAddr = await donationTracking.getAddress();
  console.log("  DonationTracking   :", dtAddr);

  const VotingGovernance = await ethers.getContractFactory("VotingGovernance");
  const votingGovernance = await VotingGovernance.deploy(pmAddr, dtAddr, deployer.address);
  await votingGovernance.waitForDeployment();
  const vgAddr = await votingGovernance.getAddress();
  console.log("  VotingGovernance   :", vgAddr);

  const CharityDAOPlatform = await ethers.getContractFactory("CharityDAOPlatform");
  const platform = await CharityDAOPlatform.deploy(pmAddr, dtAddr, vgAddr, fundAddr);
  await platform.waitForDeployment();
  const platformAddr = await platform.getAddress();
  console.log("  CharityDAOPlatform :", platformAddr);

  // 2. Link the contracts together
  console.log("\n[2/4] Linking contracts...");

  await waitFor(proposalManagement.setVotingGovernanceContract(vgAddr), "ProposalManagement -> VotingGovernance");
  await waitFor(proposalManagement.setFundAllocationContract(fundAddr), "ProposalManagement -> SecureFundAllocation");
  await waitFor(proposalManagement.setDonationTrackingContract(dtAddr), "ProposalManagement -> DonationTracking");

  await waitFor(secureFund.setPlatformContract(platformAddr), "SecureFundAllocation -> Platform");

  if (secondSigner) {
    await waitFor(proposalManagement.addSigner(secondSigner.address), "Signer added: " + secondSigner.address);
  } else {
    console.log("  WARNING: only one account available, add a second signer manually.");
  }

  // 3. Verify every link
  console.log("\n[3/4] Verifying links...");
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();
  const checks = [
    ["ProposalManagement.votingGovernanceContract = VotingGovernance", await proposalManagement.votingGovernanceContract(), vgAddr],
    ["ProposalManagement.fundAllocationContract = SecureFundAllocation", await proposalManagement.fundAllocationContract(), fundAddr],
    ["SecureFundAllocation.platformContract = Platform", await secureFund.platformContract(), platformAddr],
    ["SecureFundAllocation.proposalContract = ProposalManagement", await secureFund.proposalContract(), pmAddr],
    ["DonationTracking.fundAllocationContract = SecureFundAllocation", await donationTracking.fundAllocationContract(), fundAddr],
    ["VotingGovernance.donationContract = DonationTracking", await votingGovernance.donationContract(), dtAddr],
    ["VotingGovernance.proposalContract = ProposalManagement", await votingGovernance.proposalContract(), pmAddr],
    ["Platform.fundAllocationContract = SecureFundAllocation", await platform.fundAllocationContract(), fundAddr],
    ["Platform.donationContract = DonationTracking", await platform.donationContract(), dtAddr],
    ["Platform.votingContract = VotingGovernance", await platform.votingContract(), vgAddr],
    ["Platform.proposalContract = ProposalManagement", await platform.proposalContract(), pmAddr],
  ];
  let allGood = true;
  for (const [label, actual, expected] of checks) {
    const ok = same(actual, expected);
    if (!ok) allGood = false;
    console.log("  " + (ok ? "OK     " : "WRONG  ") + label);
  }
  if (!allGood) {
    throw new Error("Some contract links are wrong. Addresses were NOT saved.");
  }

  // 4. Save addresses (backend + the one file the frontend reads)
  console.log("\n[4/4] Saving addresses...");
  const addresses = {
    PROPOSAL_MANAGEMENT: pmAddr,
    FUND_ALLOCATION: fundAddr, // the secure contract
    DONATION_TRACKING: dtAddr,
    VOTING_GOVERNANCE: vgAddr,
    CHARITY_DAO_PLATFORM: platformAddr,
    SECURE_FUND_ALLOCATION: fundAddr, // same address, for scripts that use this name
  };

  const rootDir = path.join(__dirname, "..");
  fs.writeFileSync(path.join(rootDir, "deployedAddresses.json"), JSON.stringify(addresses, null, 2));
  console.log("  saved deployedAddresses.json");

  const frontendConfig = path.join(rootDir, "charity-dao-frontend", "src", "config");
  fs.mkdirSync(frontendConfig, { recursive: true });

  const tsContent =
    "// Auto-generated by scripts/deploy-secure-all.js - do not edit by hand\n" +
    "export const DEPLOYED_ADDRESSES = {\n" +
    Object.entries(addresses).map(([k, v]) => `  ${k}: "${v}"`).join(",\n") +
    "\n} as const;\n";
  fs.writeFileSync(path.join(frontendConfig, "deployedAddresses.ts"), tsContent);
  fs.writeFileSync(path.join(frontendConfig, "deployedAddresses.json"), JSON.stringify(addresses, null, 2));
  console.log("  saved charity-dao-frontend/src/config/deployedAddresses.ts (+ .json)");

  console.log("\n=== Done. Secure Charity DAO deployed and verified. ===");
  console.log("Reminders:");
  console.log("  - Proposals need 3 votes (3 different donor accounts) and 2 signers.");
  console.log("  - Signers: " + deployer.address + (secondSigner ? ", " + secondSigner.address : ""));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDeployment failed:", error);
    process.exit(1);
  });