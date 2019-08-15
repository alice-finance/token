require("dotenv").config();
const Token = artifacts.require("AlicePlasma");
const AliceFund = artifacts.require("AliceFund");

module.exports = async function(deployer, network) {
  if (network !== "extdev" && network !== "plasma") {
    // SKIP migration
    return;
  }

  const aliceToken = await Token.deployed();

  await deployer.deploy(
    AliceFund,
    aliceToken.address
  );
};
