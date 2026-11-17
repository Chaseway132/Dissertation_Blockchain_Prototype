import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
      accounts: ["0x4ad4f506cb5a75a0c7f3c873bfd69430e8d15a9ce6e02198ad832ac9ae6dd365"]
    },
  },
};

export default config; 