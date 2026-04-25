require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    neroTestnet: {
      url: "https://rpc-testnet.nerochain.io",
      chainId: 689,
      // Uncomment and add your private key here to deploy
      accounts: ["9e3f2e1600b407fda49e1319403290e618662811f11829b968ddba6e8499453b"]
    }
  }
};
