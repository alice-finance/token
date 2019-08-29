/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

// const HDWalletProvider = require('truffle-hdwallet-provider');
// const infuraKey = "fj4jll3k.....";
//
// const fs = require('fs');
// const mnemonic = fs.readFileSync(".secret").toString().trim();
require("dotenv").config();
const LoomTruffleProvider = require("loom-truffle-provider");
const HDWalletProvider = require("truffle-hdwallet-provider");

module.exports = {
  networks: {
    coverage: {
      host: "localhost",
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
      network_id: "*"
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          process.env.ETHEREUM_ADMIN_PRIVATE_KEY,
          "https://mainnet.infura.io/v3/" + process.env.INFURA_PROJECT_ID
        ),
      network_id: 1
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(
          process.env.ETHEREUM_ADMIN_PRIVATE_KEY,
          "https://rinkeby.infura.io/v3/" + process.env.INFURA_PROJECT_ID
        ),
      network_id: 4
    },
    extdev: {
      provider: () => {
        const provider = new LoomTruffleProvider(
          "extdev-plasma-us1",
          "http://extdev-plasma-us1.dappchains.com:80/rpc",
          "http://extdev-plasma-us1.dappchains.com:80/query",
          process.env.PLASMA_ADMIN_PRIVATE_KEY
        );
        const engine = provider.getProviderEngine();
        engine.addCustomMethod("web3_clientVersion", () => "");
        return provider;
      },
      network_id: "*"
    },
    plasma: {
      provider: () => {
        const provider = new LoomTruffleProvider(
          "default",
          "http://plasma.dappchains.com:80/rpc",
          "http://plasma.dappchains.com:80/query",
          process.env.PLASMA_ADMIN_PRIVATE_KEY
        );
        const engine = provider.getProviderEngine();
        engine.addCustomMethod("web3_clientVersion", () => "");
        return provider;
      },
      network_id: "*"
    }
  },
  compilers: {
    solc: {
      version: "0.5.8",
      settings: {
        optimizer: {
          enabled: false,
          runs: 200
        },
        evmVersion: "byzantium" // Need to set 'byzantium' due to PlasmaChain EVM version
      }
    }
  },
  plugins: ["truffle-security"]
};
