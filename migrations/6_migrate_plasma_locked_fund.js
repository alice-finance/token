require("dotenv").config();
const LockedAliceFund = artifacts.require("LockedAliceFund");
const AlicePlasma = artifacts.require("AlicePlasma");

module.exports = async function(deployer, network) {
  if (network !== "extdev" && network !== "plasma") {
    // SKIP migration
    return;
  }

  const aliceToken = await AlicePlasma.deployed();

  if (network === "extdev") {
    // Withdraw all ALICE from previous FUND
    const previousFund = await LockedAliceFund.deployed();
    if (previousFund) {
      const balance = await previousFund.balance();
      await previousFund.withdraw(balance);
    }
  }

  await deployer.deploy(LockedAliceFund, aliceToken.address);

  if (network === "extdev") {
    let aliceForSale = "500000000000000000000000000";
    const fund = await LockedAliceFund.deployed();

    await aliceToken.approve(fund.address, aliceForSale);
    await fund.deposit(aliceForSale);
  }
};
