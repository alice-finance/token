const Token = artifacts.require("Alice");

module.exports = async function(deployer, network, [owner]) {
  if (network !== "rinkeby" && network !== "mainnet") {
    // SKIP migration
    return;
  }

  await deployer.deploy(Token, owner);
};
