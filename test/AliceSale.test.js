const { BN, constants, expectEvent, expectRevert, time } = require("openzeppelin-test-helpers");
const { expect } = require("chai");

const { ZERO_ADDRESS, MAX_UINT256 } = constants;

const AliceSale = artifacts.require("AliceSale");
const LockedAliceFund = artifacts.require("LockedAliceFund");
const LockedERC20 = artifacts.require("LockedERC20");
const ERC20 = artifacts.require("ERC20Mock");

const MULTIPLIER = new BN("1000000000000000000");
const RATIO = new BN(1000);
const AMOUNT1 = MULTIPLIER.mul(new BN("100"));
const AMOUNT2 = MULTIPLIER.mul(new BN("200"));
const AMOUNT3 = MULTIPLIER.mul(new BN("300"));
const ZERO = new BN("0");

contract("AliceSale", function([admin, newAdmin, notAdmin, manager, user1, user2, user3]) {
  beforeEach(async function() {
    this.alice = await ERC20.new("ALICE", "Alice", 18);
    this.dai = await ERC20.new("DAI", "Dai Stable Coin", 18);
    this.locker = await LockedAliceFund.new(this.alice.address, { from: admin });
    const lockedAliceAddress = await this.locker.lockedAlice();
    this.lockedAlice = await LockedERC20.at(lockedAliceAddress);
    this.sale = await AliceSale.new(this.alice.address, this.dai.address, this.locker.address, RATIO);

    await this.alice.mint(admin, MAX_UINT256);
    await this.alice.approve(this.locker.address, MAX_UINT256, { from: admin });
    await this.locker.deposit(
      AMOUNT1.add(AMOUNT2)
        .add(AMOUNT3)
        .mul(RATIO)
    );
    await this.locker.lock(
      this.sale.address,
      AMOUNT1.add(AMOUNT2)
        .add(AMOUNT3)
        .mul(RATIO),
      0,
      { from: admin }
    );
  });

  it("should have valid values", async function() {
    expect(await this.sale.owner()).to.be.equal(admin);
    expect(await this.sale.locker()).to.be.equal(this.locker.address);
    expect(await this.sale.alice()).to.be.equal(this.alice.address);
    expect(await this.sale.dai()).to.be.equal(this.dai.address);
    expect(await this.sale.daiRaised()).to.be.bignumber.equal(ZERO);
    expect(await this.sale.ratio()).to.be.bignumber.equal(RATIO);
  });

  it("should change admin", async function() {
    await expectRevert(
      this.sale.transferOwnership(ZERO_ADDRESS, { from: admin }),
      "AliceSale: new owner is zero address"
    );
    const { logs: log1 } = await this.sale.transferOwnership(newAdmin, { from: admin });
    expectEvent.inLogs(log1, "OwnershipTransferred", {
      from: admin,
      to: newAdmin
    });

    expect(await this.sale.owner()).to.be.equal(newAdmin);

    const { logs: log2 } = await this.sale.renounceOwnership({ from: newAdmin });
    expectEvent.inLogs(log2, "OwnershipTransferred", {
      from: newAdmin,
      to: ZERO_ADDRESS
    });

    expect(await this.sale.owner()).to.be.equal(ZERO_ADDRESS);
  });

  describe("buying ALICE", async function() {
    beforeEach(async function() {
      await this.dai.mint(user1, AMOUNT1.add(AMOUNT2).add(AMOUNT3));
      await this.dai.mint(user2, AMOUNT1.add(AMOUNT2).add(AMOUNT3));
      await this.dai.mint(user3, AMOUNT1.add(AMOUNT2).add(AMOUNT3));

      await this.dai.approve(this.sale.address, AMOUNT1.add(AMOUNT2).add(AMOUNT3), { from: user1 });
      await this.dai.approve(this.sale.address, AMOUNT1.add(AMOUNT2).add(AMOUNT3), { from: user2 });
      await this.dai.approve(this.sale.address, AMOUNT1.add(AMOUNT2).add(AMOUNT3), { from: user3 });
    });

    it("should buy ALICE", async function() {
      await this.sale.buyAlice(AMOUNT1, { from: user1 });

      expect(await this.alice.balanceOf(user1)).to.be.bignumber.equal(AMOUNT1.mul(RATIO));
      expect(await this.sale.daiRaised()).to.be.bignumber.equal(AMOUNT1);
      expect(await this.sale.aliceSold()).to.be.bignumber.equal(AMOUNT1.mul(RATIO));
      expect(await this.dai.balanceOf(this.sale.address)).to.be.bignumber.equal(AMOUNT1);

      await this.sale.buyAlice(AMOUNT2, { from: user2 });

      expect(await this.alice.balanceOf(user2)).to.be.bignumber.equal(AMOUNT2.mul(RATIO));
      expect(await this.sale.daiRaised()).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2));
      expect(await this.sale.aliceSold()).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2).mul(RATIO));
      expect(await this.dai.balanceOf(this.sale.address)).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2));

      await this.sale.buyAlice(AMOUNT3, { from: user3 });

      expect(await this.alice.balanceOf(user3)).to.be.bignumber.equal(AMOUNT3.mul(RATIO));
      expect(await this.sale.daiRaised()).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2).add(AMOUNT3));
      expect(await this.sale.aliceSold()).to.be.bignumber.equal(
        AMOUNT1.add(AMOUNT2)
          .add(AMOUNT3)
          .mul(RATIO)
      );
      expect(await this.dai.balanceOf(this.sale.address)).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2).add(AMOUNT3));
    });

    it("should buy ALICE for someone else", async function() {
      await this.sale.buyAliceFor(user2, AMOUNT1, { from: user1 });

      expect(await this.alice.balanceOf(user2)).to.be.bignumber.equal(AMOUNT1.mul(RATIO));
      expect(await this.sale.daiRaised()).to.be.bignumber.equal(AMOUNT1);
      expect(await this.dai.balanceOf(this.sale.address)).to.be.bignumber.equal(AMOUNT1);
    });

    it("should fail when DAI amount is ZERO", async function() {
      await expectRevert(this.sale.buyAlice(ZERO, { from: user1 }), "AliceSale: DAI amount is ZERO");
    });

    it("should fail when beneficiary is ZERO_ADDRESS", async function() {
      await expectRevert(
        this.sale.buyAliceFor(ZERO_ADDRESS, AMOUNT1, { from: user1 }),
        "AliceSale: beneficiary is ZERO_ADDRESS"
      );
    });

    it("should fail when not approved DAI enough", async function() {
      await this.dai.approve(this.sale.address, AMOUNT1, { from: user1 });
      await expectRevert(this.sale.buyAlice(AMOUNT2, { from: user1 }), "AliceSale: DAI amount exceeds allowance");
    });

    it("should fail when not have enough DAI", async function() {
      await this.dai.burn(user1, AMOUNT1.add(AMOUNT3));
      await expectRevert(this.sale.buyAlice(AMOUNT3, { from: user1 }), "AliceSale: DAI amount exceeds balance");
    });

    it("should withdraw raised DAI", async function() {
      await this.sale.buyAlice(AMOUNT1, { from: user1 });
      await this.sale.buyAlice(AMOUNT2, { from: user2 });
      await this.sale.buyAlice(AMOUNT3, { from: user3 });

      expect(await this.sale.daiRaised()).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2).add(AMOUNT3));
      expect(await this.dai.balanceOf(this.sale.address)).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2).add(AMOUNT3));

      await this.sale.withdraw(AMOUNT1, { from: admin });

      await expectRevert(this.sale.withdraw(AMOUNT1, {from: user1}), "AliceSale: caller is not owner");

      expect(await this.sale.daiRaised()).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2).add(AMOUNT3));
      expect(await this.dai.balanceOf(this.sale.address)).to.be.bignumber.equal(AMOUNT2.add(AMOUNT3));

      await this.sale.withdraw(AMOUNT2.add(AMOUNT3), { from: admin });

      expect(await this.sale.daiRaised()).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2).add(AMOUNT3));
      expect(await this.dai.balanceOf(this.sale.address)).to.be.bignumber.equal(ZERO);

      await expectRevert(this.sale.withdraw(AMOUNT1, { from: admin }), "AliceSale: insufficient DAI");
    });
  });
});
