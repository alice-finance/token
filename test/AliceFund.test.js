const { BN, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers");
const { expect } = require("chai");

const { ZERO_ADDRESS, MAX_UINT256 } = constants;

const AliceFund = artifacts.require("AliceFund");
const ERC20 = artifacts.require("ERC20Mock");

const MULTIPLIER = new BN("1000000000000000000");
const AMOUNT1 = MULTIPLIER.mul(new BN(100));
const AMOUNT2 = MULTIPLIER.mul(new BN(200));
const AMOUNT3 = MULTIPLIER.mul(new BN(300));

contract("AliceFund", function([admin, newAdmin, IFO, newIFO, notAdmin]) {
  before(async function() {
    this.alice = await ERC20.new("Alice", "ALICE", 18);
    await this.alice.mint(admin, MAX_UINT256);
  });

  beforeEach(async function() {
    this.fund = await AliceFund.new(this.alice.address);
  });

  describe("ownership", function() {
    it("should transfer ownership", async function() {
      const { logs } = await this.fund.transferOwnership(newAdmin, { from: admin });

      expectEvent.inLogs(logs, "OwnershipTransferred", {
        from: admin,
        to: newAdmin
      });

      const owner = await this.fund.owner();
      expect(owner).to.be.equal(newAdmin);
    });

    describe("should fail to transfer ownership", function() {
      it("when newOwner is ZERO_ADDRESS", async function() {
        await expectRevert(this.fund.transferOwnership(ZERO_ADDRESS, { from: admin }), "new owner is zero address");
      });

      it("when not called from owner", async function() {
        await expectRevert(this.fund.transferOwnership(newAdmin, { from: notAdmin }), "caller is not owner");
      });
    });
  });

  describe("IFO", function() {
    it("should change IFO", async function() {
      await this.alice.transfer(this.fund.address, AMOUNT2, { from: admin });

      let { logs } = await this.fund.changeIFO(IFO, { from: admin });

      expectEvent.inLogs(logs, "IFOChanged", {
        from: ZERO_ADDRESS,
        to: IFO
      });

      let resolvedIFO = await this.fund.ifo();
      expect(resolvedIFO).to.be.equal(IFO);

      let allowance = await this.alice.allowance(this.fund.address, IFO);
      let balance = await this.alice.balanceOf(this.fund.address);

      expect(allowance).to.be.bignumber.equal(balance);

      ({ logs } = await this.fund.changeIFO(newIFO, { from: admin }));

      expectEvent.inLogs(logs, "IFOChanged", {
        from: IFO,
        to: newIFO
      });

      resolvedIFO = await this.fund.ifo();
      expect(resolvedIFO).to.be.equal(newIFO);

      allowance = await this.alice.allowance(this.fund.address, newIFO);
      balance = await this.alice.balanceOf(this.fund.address);

      expect(allowance).to.be.bignumber.equal(balance);

      allowance = await this.alice.allowance(this.fund.address, IFO);

      expect(allowance).to.be.bignumber.equal(new BN(0));
    });

    describe("should fail to change IFO", function() {
      it("when newIFO is ZERO_ADDRESS", async function() {
        await expectRevert(this.fund.changeIFO(ZERO_ADDRESS, { from: admin }), "new IFO is zero address");
      });

      it("when not called from owner", async function() {
        await expectRevert(this.fund.changeIFO(newIFO, { from: notAdmin }), "caller is not owner");
      });
    });
  });

  describe("Deposit", function() {
    it("should deposit alice", async function() {
      await this.fund.changeIFO(IFO, { from: admin });
      await this.alice.approve(this.fund.address, AMOUNT1, { from: admin });

      const { logs } = await this.fund.deposit(AMOUNT1, { from: admin });

      expectEvent.inLogs(logs, "AliceDeposited", {
        ifo: IFO,
        amount: AMOUNT1
      });

      expect(await this.alice.balanceOf(this.fund.address)).to.be.bignumber.equal(AMOUNT1);
    });

    describe("should fail to deposit", function() {
      it("when not IFO is not setted", async function() {
        await this.alice.approve(this.fund.address, AMOUNT1, { from: admin });
        await expectRevert(this.fund.deposit(AMOUNT1, { from: admin }), "IFO is not setted");
      });

      it("when not called from owner", async function() {
        await this.fund.changeIFO(IFO, { from: admin });
        await this.alice.approve(this.fund.address, AMOUNT1, { from: admin });
        await expectRevert(this.fund.deposit(AMOUNT1, { from: notAdmin }), "caller is not owner");
      });

      it("when transfer is not aproved", async function() {
        await this.fund.changeIFO(IFO, { from: admin });
        await this.alice.approve(this.fund.address, AMOUNT1, { from: admin });
        await expectRevert(this.fund.deposit(AMOUNT3, { from: admin }), "allowance not met");
      });
    });
  });
});
