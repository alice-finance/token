const { BN, expectRevert, time, constants } = require("openzeppelin-test-helpers");
const { expect } = require("chai");

const { ZERO_ADDRESS } = constants;

const LockedERC20 = artifacts.require("LockedERC20");

const MULTIPLIER = new BN("1000000000000000000");
const AMOUNT1 = MULTIPLIER.mul(new BN("100"));
const AMOUNT2 = MULTIPLIER.mul(new BN("200"));
const AMOUNT3 = MULTIPLIER.mul(new BN("300"));
const ZERO = new BN("0");

contract("LockedERC20", function([admin, notAdmin, user1, user2, user3]) {
  beforeEach(async function() {
    this.token = await LockedERC20.new("LAX", "Locked Alice", 18, { from: admin });
  });

  it("should have owner", async function() {
    const owner = await this.token.owner();
    expect(owner).to.be.equal(admin);
  });

  it("should mint and burn", async function() {
    await this.token.mint(user1, AMOUNT1, { from: admin });
    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(AMOUNT1);

    await this.token.mint(user1, AMOUNT2, { from: admin });
    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2));

    await this.token.mint(user1, AMOUNT3, { from: admin });
    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2).add(AMOUNT3));

    expect(await this.token.totalSupply()).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2).add(AMOUNT3));

    await this.token.burn(user1, AMOUNT1, { from: admin });
    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(AMOUNT2.add(AMOUNT3));

    await this.token.burn(user1, AMOUNT1, { from: admin });
    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(AMOUNT1.add(AMOUNT3));

    await this.token.burn(user1, AMOUNT1.add(AMOUNT3), { from: admin });
    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(ZERO);

    expect(await this.token.totalSupply()).to.be.bignumber.equal(ZERO);
  });

  it("should not mint and burn when address is ZERO", async function() {
    await expectRevert(
      this.token.mint(ZERO_ADDRESS, AMOUNT1, { from: admin }),
      "LockedERC20: mint to the zero address"
    );
    await expectRevert(
      this.token.burn(ZERO_ADDRESS, AMOUNT1, { from: admin }),
      "LockedERC20: burn from the zero address"
    );
  });

  it("should mintWithLock", async function() {
    const now = await time.latest();
    await this.token.mintWithLock(user1, AMOUNT1, now.add(time.duration.seconds(60)), { from: admin });
    await this.token.mintWithLock(user1, AMOUNT2, now.add(time.duration.seconds(60 * 2)), { from: admin });
    await this.token.mintWithLock(user1, AMOUNT3, now.add(time.duration.seconds(60 * 3)), { from: admin });

    let totalBalance = AMOUNT1.add(AMOUNT2).add(AMOUNT3);

    expect(await this.token.totalSupply()).to.be.bignumber.equal(totalBalance);
    expect(await this.token.lockedTotalSupply()).to.be.bignumber.equal(totalBalance);
    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(totalBalance);
    expect(await this.token.lockedBalanceOf(user1)).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2).add(AMOUNT3));
    expect(await this.token.unlockedBalanceOf(user1)).to.be.bignumber.equal(ZERO);

    await time.increaseTo(now.add(time.duration.seconds(60)));

    expect(await this.token.totalSupply()).to.be.bignumber.equal(totalBalance);
    expect(await this.token.lockedTotalSupply()).to.be.bignumber.equal(AMOUNT2.add(AMOUNT3));
    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(totalBalance);
    expect(await this.token.lockedBalanceOf(user1)).to.be.bignumber.equal(AMOUNT2.add(AMOUNT3));
    expect(await this.token.unlockedBalanceOf(user1)).to.be.bignumber.equal(AMOUNT1);

    await time.increaseTo(now.add(time.duration.seconds(60 * 2)));

    expect(await this.token.totalSupply()).to.be.bignumber.equal(totalBalance);
    expect(await this.token.lockedTotalSupply()).to.be.bignumber.equal(AMOUNT3);
    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(totalBalance);
    expect(await this.token.lockedBalanceOf(user1)).to.be.bignumber.equal(AMOUNT3);
    expect(await this.token.unlockedBalanceOf(user1)).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2));

    await time.increaseTo(now.add(time.duration.seconds(60 * 3)));

    expect(await this.token.totalSupply()).to.be.bignumber.equal(totalBalance);
    expect(await this.token.lockedTotalSupply()).to.be.bignumber.equal(ZERO);
    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(totalBalance);
    expect(await this.token.lockedBalanceOf(user1)).to.be.bignumber.equal(ZERO);
    expect(await this.token.unlockedBalanceOf(user1)).to.be.bignumber.equal(totalBalance);
  });

  it("should get timelock list", async function() {
    const now = await time.latest();
    await this.token.mintWithLock(user1, AMOUNT1, now.add(time.duration.seconds(60)), { from: admin });
    await this.token.mintWithLock(user1, AMOUNT2, now.add(time.duration.seconds(60 * 2)), { from: admin });
    await this.token.mintWithLock(user1, AMOUNT3, now.add(time.duration.seconds(60 * 3)), { from: admin });

    await time.increaseTo(now.add(time.duration.seconds(60)));

    let locks = await this.token.timeLocks();

    expect(locks.length).to.be.equal(3);
    expect(new BN(locks[0].amount)).to.be.bignumber.equal(AMOUNT1);
    expect(new BN(locks[1].amount)).to.be.bignumber.equal(AMOUNT2);
    expect(new BN(locks[2].amount)).to.be.bignumber.equal(AMOUNT3);
  });

  it("should not mint and burn when caller is not owner", async function() {
    await expectRevert(this.token.mint(user1, AMOUNT1, { from: notAdmin }), "LockedERC20: caller is not owner");
    await expectRevert(
      this.token.mintWithLock(user1, AMOUNT1, 60, { from: notAdmin }),
      "LockedERC20: caller is not owner"
    );
    await this.token.mint(user1, AMOUNT1, { from: admin });
    await expectRevert(this.token.burn(user1, AMOUNT1, { from: notAdmin }), "LockedERC20: caller is not owner");
  });

  it("should transfer only unlocked amount", async function() {
    const now = await time.latest();
    await this.token.mintWithLock(user1, AMOUNT1, now.add(time.duration.seconds(60)), { from: admin });
    await this.token.mintWithLock(user1, AMOUNT2, now.add(time.duration.seconds(60 * 2)), { from: admin });
    await this.token.mintWithLock(user1, AMOUNT3, now.add(time.duration.seconds(60 * 3)), { from: admin });
    await this.token.mintWithLock(user2, AMOUNT3, now.add(time.duration.seconds(60 * 4)), { from: admin });
    await time.increaseTo(now.add(time.duration.seconds(60)));

    await this.token.transfer(user2, AMOUNT1, { from: user1 });

    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(AMOUNT2.add(AMOUNT3));
    expect(await this.token.unlockedBalanceOf(user1)).to.be.bignumber.equal(ZERO);
    expect(await this.token.lockedBalanceOf(user1)).to.be.bignumber.equal(AMOUNT2.add(AMOUNT3));

    expect(await this.token.balanceOf(user2)).to.be.bignumber.equal(AMOUNT1.add(AMOUNT3));
    expect(await this.token.unlockedBalanceOf(user2)).to.be.bignumber.equal(AMOUNT1);
    expect(await this.token.lockedBalanceOf(user2)).to.be.bignumber.equal(AMOUNT3);

    await expectRevert(
      this.token.transfer(user2, AMOUNT2, { from: user1 }),
      "LockedERC20: transfer amount exceeds unlocked"
    );

    await time.increaseTo(now.add(time.duration.seconds(60 * 2)));

    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(AMOUNT2.add(AMOUNT3));
    expect(await this.token.unlockedBalanceOf(user1)).to.be.bignumber.equal(AMOUNT2);
    expect(await this.token.lockedBalanceOf(user1)).to.be.bignumber.equal(AMOUNT3);

    await this.token.approve(user3, AMOUNT2.add(AMOUNT3), { from: user1 });

    await this.token.transferFrom(user1, user2, AMOUNT2, { from: user3 });

    expect(await this.token.balanceOf(user1)).to.be.bignumber.equal(AMOUNT3);
    expect(await this.token.unlockedBalanceOf(user1)).to.be.bignumber.equal(ZERO);
    expect(await this.token.lockedBalanceOf(user1)).to.be.bignumber.equal(AMOUNT3);

    expect(await this.token.balanceOf(user2)).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2).add(AMOUNT3));
    expect(await this.token.unlockedBalanceOf(user2)).to.be.bignumber.equal(AMOUNT1.add(AMOUNT2));
    expect(await this.token.lockedBalanceOf(user2)).to.be.bignumber.equal(AMOUNT3);

    await expectRevert(
      this.token.transferFrom(user1, user2, AMOUNT3, { from: user3 }),
      "LockedERC20: transfer amount exceeds unlocked"
    );
  });
});
