require("dotenv").config();
const Token = artifacts.require("AlicePlasma");

module.exports = async function(deployer, network) {
  if (network !== "extdev" && network !== "plasma") {
    // SKIP migration
    return;
  }

  await deployer.deploy(Token, process.env.GATEWAY_ADDRESS);
};
