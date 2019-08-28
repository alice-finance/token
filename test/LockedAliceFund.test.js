const { BN, constants, expectEvent, expectRevert, time } = require("openzeppelin-test-helpers");
const { expect } = require("chai");

const { ZERO_ADDRESS, MAX_UINT256 } = constants;

const LockedAliceFund = artifacts.require("LockedAliceFund");
const LockedERC20 = artifacts.require("LockedERC20");
const ERC20 = artifacts.require("ERC20Mock");

const MULTIPLIER = new BN("1000000000000000000");
const AMOUNT1 = MULTIPLIER.mul(new BN("100"));
const AMOUNT2 = MULTIPLIER.mul(new BN("200"));
const AMOUNT3 = MULTIPLIER.mul(new BN("300"));
const ZERO = new BN("0");

contract("LockedAliceFund", function([admin, newAdmin, notAdmin, user1, user2, user3]) {
  beforeEach(async function() {
    this.alice = await ERC20.new("ALICE", "Alice", 18);
    this.locker = await LockedAliceFund.new(this.alice.address, { from: admin });
    const lockedAliceAddress = await this.locker.lockedAlice();
    this.lockedAlice = await LockedERC20.at(lockedAliceAddress);
  });

  it("should have valid values", async function() {
    expect(await this.locker.alice()).to.be.equal(this.alice.address);
    expect(await this.locker.owner()).to.be.equal(admin);
    expect(await this.locker.balance()).to.be.bignumber.equal(ZERO);
  });

  it("should change admin", async function() {
    await expectRevert(this.locker.transferOwnership(ZERO_ADDRESS, { from: admin }), "LockedAliceFund: new owner is zero address");
    const { logs: log1 } = await this.locker.transferOwnership(newAdmin, { from: admin });
    expectEvent.inLogs(log1, "OwnershipTransferred", {
      from: admin,
      to: newAdmin
    });

    expect(await this.locker.owner()).to.be.equal(newAdmin);

    const { logs: log2 } = await this.locker.renounceOwnership({ from: newAdmin });
    expectEvent.inLogs(log2, "OwnershipTransferred", {
      from: newAdmin,
      to: ZERO_ADDRESS
    });

    expect(await this.locker.owner()).to.be.equal(ZERO_ADDRESS);
  });

  it("should deposit alice", async function() {
    await this.alice.mint(admin, MAX_UINT256);

    await this.alice.approve(this.locker.address, AMOUNT1, { from: admin });
    const { logs } = await this.locker.deposit(AMOUNT1, { from: admin });

    expectEvent.inLogs(logs, "AliceDeposited", {
      from: admin,
      amount: AMOUNT1
    });

    expect(await this.locker.balance()).to.be.bignumber.equal(AMOUNT1);
    expect(await this.alice.balanceOf(this.locker.address)).to.be.bignumber.equal(AMOUNT1);
  });

  it("should not deposit alice when caller is not owner", async function() {
    await this.alice.mint(notAdmin, MAX_UINT256);
    await this.alice.approve(this.locker.address, AMOUNT1, { from: notAdmin });

    await expectRevert(this.locker.deposit(AMOUNT1, { from: notAdmin }), "LockedAliceFund: caller is not owner");
  });

  describe("lock and unlock", function() {
    beforeEach(async function() {
      await this.alice.mint(admin, MAX_UINT256);
      await this.alice.approve(this.locker.address, MAX_UINT256, { from: admin });
      await this.locker.deposit(AMOUNT1.add(AMOUNT2).add(AMOUNT3), { from: admin });
    });

    it("should lock and unlock alice to user", async function() {
      const now = await time.latest();
      const releaseAfter = now.add(time.duration.days(1));
      const { logs: logs1 } = await this.locker.lock(user1, AMOUNT1, releaseAfter, { from: admin });

      expectEvent.inLogs(logs1, "AliceLocked", {
        to: user1,
        amount: AMOUNT1,
        releaseAfter: new BN(releaseAfter)
      });

      expect(await this.locker.balance()).to.be.bignumber.equal(AMOUNT2.add(AMOUNT3));
      expect(await this.lockedAlice.balanceOf(user1)).to.be.bignumber.equal(AMOUNT1);
      expect(await this.lockedAlice.lockedBalanceOf(user1)).to.be.bignumber.equal(AMOUNT1);
      expect(await this.lockedAlice.unlockedBalanceOf(user1)).to.be.bignumber.equal(ZERO);
      expect(await this.alice.balanceOf(user1)).to.be.bignumber.equal(ZERO);

      await time.increaseTo(releaseAfter);

      const { logs: logs2 } = await this.locker.unlock(AMOUNT1, { from: user1 });

      expectEvent.inLogs(logs2, "AliceUnlocked", {
        from: user1,
        amount: AMOUNT1
      });

      expect(await this.locker.balance()).to.be.bignumber.equal(AMOUNT2.add(AMOUNT3));
      expect(await this.lockedAlice.balanceOf(user1)).to.be.bignumber.equal(ZERO);
      expect(await this.lockedAlice.lockedBalanceOf(user1)).to.be.bignumber.equal(ZERO);
      expect(await this.lockedAlice.unlockedBalanceOf(user1)).to.be.bignumber.equal(ZERO);
      expect(await this.alice.balanceOf(user1)).to.be.bignumber.equal(AMOUNT1);
    });

    it("should withdraw only not locked amount", async function() {
      const releaseAfter = (await time.latest()).add(time.duration.seconds(60));
      await this.locker.lock(user1, AMOUNT1, releaseAfter, { from: admin });

      await expectRevert(
        this.locker.withdraw(AMOUNT1.add(AMOUNT2).add(AMOUNT3), { from: admin }),
        "LockedAliceFund: insufficient ALICE to withdraw"
      );

      const { logs } = await this.locker.withdraw(AMOUNT2.add(AMOUNT3), { from: admin });
      expectEvent.inLogs(logs, "AliceWithdrawn", {
        to: admin,
        amount: AMOUNT2.add(AMOUNT3)
      });

      expect(await this.locker.balance()).to.be.bignumber.equal(ZERO);
    });

    it("should lock remaining balance only", async function() {
      const releaseAfter = (await time.latest()).add(time.duration.seconds(60));
      await this.locker.lock(user1, AMOUNT1, releaseAfter, { from: admin });
      await this.locker.lock(user2, AMOUNT2, releaseAfter, { from: admin });
      await this.locker.lock(user3, AMOUNT3, releaseAfter, { from: admin });

      await expectRevert(
        this.locker.lock(user1, AMOUNT1, releaseAfter, { from: admin }),
        "LockedAliceFund: insufficient ALICE to lock"
      );
    });

    it("should unlock for other", async function() {
      await expectRevert(this.locker.lock(user1, AMOUNT1, 0, { from: user2 }), "LockedAliceFund: caller is not owner");
      await this.locker.lock(user1, AMOUNT1, 0, { from: admin });
      await expectRevert(this.locker.unlockFor(user1, AMOUNT1, { from: user2 }), "LockedAliceFund: caller is not owner");
      await this.locker.unlockFor(user1, AMOUNT1, { from: admin });
    });

    it("should unlock unlocked balance only", async function() {
      const releaseAfter = (await time.latest()).add(time.duration.seconds(60));
      await this.locker.lock(user1, AMOUNT1, releaseAfter, { from: admin });
      await this.locker.lock(user1, AMOUNT2, releaseAfter.add(time.duration.seconds(60)), { from: admin });

      await time.increaseTo(releaseAfter);

      await this.locker.unlock(AMOUNT1, { from: user1 });
      await expectRevert(this.locker.unlock(AMOUNT2, { from: user1 }), "LockedAliceFund: insufficient Locked ALICE");
    });
  });
});
