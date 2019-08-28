require("dotenv").config();
const AliceSale = artifacts.require("AliceSale");
const LockedAliceFund = artifacts.require("LockedAliceFund");
const AlicePlasma = artifacts.require("AlicePlasma");
const IERC20 = artifacts.require("IERC20");

const RATIO = 1000;

module.exports = async function(deployer, network) {
  if (network !== "extdev" && network !== "plasma") {
    // SKIP migration
    return;
  }

  const aliceToken = await AlicePlasma.deployed();
  const daiToken = await IERC20.at(process.env.DAI_ADDRESS);
  const lockedFund = await LockedAliceFund.deployed();

  await deployer.deploy(AliceSale, aliceToken.address, daiToken.address, lockedFund.address, RATIO);

  if (network === "extdev") {
    let aliceForSale = "500000000000000000000000000";

    const sale = await AliceSale.deployed();
    await lockedFund.lock(sale.address, aliceForSale, 0);
  }
};
