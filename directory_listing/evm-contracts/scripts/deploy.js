const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const contract = await hre.ethers.deployContract("DirectoryListing");
  await contract.waitForDeployment();

  console.log("DirectoryListing deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
