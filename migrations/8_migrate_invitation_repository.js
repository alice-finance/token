require("dotenv").config();
const InvitationRepository = artifacts.require("InvitationRepository");

module.exports = async function(deployer, network) {
  if (network !== "extdev" && network !== "plasma") {
    // SKIP migration
    return;
  }

  const AMOUNT_PER_INVITEE = "25000000000000000000"; // 25 * 10^18

  await deployer.deploy(InvitationRepository, process.env.MARKET_ADDRESS, AMOUNT_PER_INVITEE);
};
