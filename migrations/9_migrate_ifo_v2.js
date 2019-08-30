require("dotenv").config();
const Token = artifacts.require("AlicePlasma");
const AliceIFO = artifacts.require("AliceIFO");
const AliceIFOv2 = artifacts.require("AliceIFOv2");
const AliceFund = artifacts.require("AliceFund");

module.exports = async function(deployer, network) {
  if (network !== "extdev" && network !== "plasma") {
    // SKIP migration
    return;
  }

  const HALF_LIFE = "8750000000000000000000000"; // 8.75 * 10^7 * 10^18
  let interval = 60 * 60 * 24; // 24 hours

  if (network === "extdev") {
    interval = 60; // 1 minute
  }

  const aliceToken = await Token.deployed();
  const ifo1 = await AliceIFO.deployed();
  const fund = await AliceFund.deployed();
  const repository = await InvitationRepository.deployed();

  await deployer.deploy(
    AliceIFOv2,
    process.env.MARKET_ADDRESS,
    ifo1.address,
    repository.address,
    aliceToken.address,
    fund.address,
    HALF_LIFE,
    interval
  );

  const ifo = await AliceIFOv2.deployed();
  await fund.changeIFO(ifo.address);
};
