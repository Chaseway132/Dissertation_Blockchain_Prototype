const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment...");

  // Get the deployer's address
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", await deployer.getAddress());

  try {
    // Deploy ProposalManagement contract
    console.log("\nDeploying ProposalManagement...");
    const ProposalManagement = await ethers.getContractFactory("ProposalManagement");
    const proposalManagement = await ProposalManagement.deploy();
    await proposalManagement.waitForDeployment();
    const proposalManagementAddress = await proposalManagement.getAddress();
    console.log("ProposalManagement deployed to:", proposalManagementAddress);

    // Deploy FundAllocation contract with ProposalManagement address
    console.log("\nDeploying FundAllocation...");
    const FundAllocation = await ethers.getContractFactory("FundAllocation");
    const fundAllocation = await FundAllocation.deploy(proposalManagementAddress);
    await fundAllocation.waitForDeployment();
    const fundAllocationAddress = await fundAllocation.getAddress();
    console.log("FundAllocation deployed to:", fundAllocationAddress);

    // Deploy DonationTracking contract with FundAllocation address
    console.log("\nDeploying DonationTracking...");
    const DonationTracking = await ethers.getContractFactory("DonationTracking");
    const donationTracking = await DonationTracking.deploy(fundAllocationAddress);
    await donationTracking.waitForDeployment();
    const donationTrackingAddress = await donationTracking.getAddress();
    console.log("DonationTracking deployed to:", donationTrackingAddress);

    // Deploy VotingGovernance contract with dependencies
    console.log("\nDeploying VotingGovernance...");
    const VotingGovernance = await ethers.getContractFactory("VotingGovernance");
    const votingGovernance = await VotingGovernance.deploy(
      proposalManagementAddress,
      donationTrackingAddress,
      await deployer.getAddress()
    );
    await votingGovernance.waitForDeployment();
    const votingGovernanceAddress = await votingGovernance.getAddress();
    console.log("VotingGovernance deployed to:", votingGovernanceAddress);

    // Deploy main CharityDAOPlatform contract with all dependencies
    console.log("\nDeploying CharityDAOPlatform...");
    const CharityDAOPlatform = await ethers.getContractFactory("CharityDAOPlatform");
    const charityDAOPlatform = await CharityDAOPlatform.deploy(
      proposalManagementAddress,
      donationTrackingAddress,
      votingGovernanceAddress,
      fundAllocationAddress
    );
    await charityDAOPlatform.waitForDeployment();
    const charityDAOPlatformAddress = await charityDAOPlatform.getAddress();
    console.log("CharityDAOPlatform deployed to:", charityDAOPlatformAddress);

    // Transfer ownership of FundAllocation to CharityDAOPlatform
    console.log("Transferring FundAllocation ownership to CharityDAOPlatform...");
    const fundAllocationWithSigner = await ethers.getContractAt("FundAllocation", fundAllocationAddress, deployer);
    await fundAllocationWithSigner.transferOwnership(charityDAOPlatformAddress);
    console.log("FundAllocation ownership transferred successfully");
    
    // Link VotingGovernance to ProposalManagement so the frontend never has to ask the owner to do it
    try {
      const pm = await ethers.getContractAt("ProposalManagement", proposalManagementAddress, deployer);
      await (await pm.setVotingGovernanceContract(votingGovernanceAddress)).wait();
      console.log("VotingGovernance linked to ProposalManagement");
            await (await pm.setFundAllocationContract(fundAllocationAddress)).wait();
      console.log("FundAllocation linked to ProposalManagement");
      await (await pm.setDonationTrackingContract(donationTrackingAddress)).wait();
      console.log("DonationTracking linked to ProposalManagement");
    } catch (linkError) {
      console.warn("Linking step failed, continuing:", linkError.message);
    }

    // Save contract addresses
    const addresses = {
      PROPOSAL_MANAGEMENT: proposalManagementAddress,
      FUND_ALLOCATION: fundAllocationAddress,
      DONATION_TRACKING: donationTrackingAddress,
      VOTING_GOVERNANCE: votingGovernanceAddress,
      CHARITY_DAO_PLATFORM: charityDAOPlatformAddress
    };

    // Save to JSON file
    const addressesPath = path.join(__dirname, '../../deployedAddresses.json');
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    console.log("\nContract addresses saved to:", addressesPath);

    // Save to TypeScript file for frontend
    const tsContent = `// Auto-generated contract addresses
export const DEPLOYED_ADDRESSES = {
  PROPOSAL_MANAGEMENT: "${proposalManagementAddress}",
  FUND_ALLOCATION: "${fundAllocationAddress}",
  DONATION_TRACKING: "${donationTrackingAddress}",
  VOTING_GOVERNANCE: "${votingGovernanceAddress}",
  CHARITY_DAO_PLATFORM: "${charityDAOPlatformAddress}"
} as const;`;

    const tsPath = path.join(__dirname, '../../charity-dao-frontend/src/contracts/deployedAddresses.ts');
    fs.writeFileSync(tsPath, tsContent);
    console.log("Contract addresses saved to:", tsPath);

    // Verify contract owner
    const owner = await votingGovernance.owner();
    console.log("\nVerifying contract owner...");
    console.log("Owner address:", owner);
    console.log("Deployer address:", await deployer.getAddress());
    console.log("Owner is deployer:", owner === await deployer.getAddress());

    console.log("\nDeployment Summary:");
    console.log("-------------------");
    console.log("ProposalManagement:", proposalManagementAddress);
    console.log("DonationTracking:", donationTrackingAddress);
    console.log("VotingGovernance:", votingGovernanceAddress);
    console.log("FundAllocation:", fundAllocationAddress);
    console.log("CharityDAOPlatform:", charityDAOPlatformAddress);
    console.log("\nDeployment completed successfully!");

  } catch (error) {
    console.error("\nDeployment failed!");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nTop-level error:");
    console.error(error);
    process.exit(1);
  });
