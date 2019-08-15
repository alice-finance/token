require("dotenv").config();
const Token = artifacts.require("AlicePlasma");
const AliceIFO = artifacts.require("AliceIFO");
const AliceFund = artifacts.require("AliceFund");

module.exports = async function(deployer, network) {
  if (network !== "extdev" && network !== "plasma") {
    // SKIP migration
    return;
  }

  const HALF_LIFE = "8750000000000000000000000"; // 8.75 * 10^7 * 10^18
  let interval = 60 * 60 * 24; // 24 hours
  let startsAt = 1565827200; // 2019-08-15T00:00:00Z+00:00

  if (network === "extdev") {
    interval = 60; // 1 minute
    startsAt = Math.floor((new Date()).getTime() / 1000);
  }

  const aliceToken = await Token.deployed();
  const fund = await AliceFund.deployed();

  await deployer.deploy(
    AliceIFO,
    process.env.MARKET_ADDRESS,
    aliceToken.address,
    fund.address,
    HALF_LIFE,
    interval,
    startsAt
  );

  const ifo = await AliceIFO.deployed();
  await fund.changeIFO(ifo.address);
};
