import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: { compilers: [{ version: "0.8.24" }], overrides: {} },
  networks: {
    hardhat: {
      forking: { url: "https://eth-mainnet.public.blastapi.io", blockNumber: 19000000 },
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        accountsBalance: "10000000000000000000000000",
      },
      blockGasLimit: 30000000,
    },
    sepolia: {
      url: "https://rpc.sepolia.org",
      accounts: require("./goerli.json").privateKey,
    },
  },
};

export default config;
