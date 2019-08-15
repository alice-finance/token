const { BN, time, constants, expectEvent, expectRevert } = require("openzeppelin-test-helpers");
const { expect } = require("chai");

const AliceIFO = artifacts.require("AliceIFO");
const AliceFund = artifacts.require("AliceFund");
const MoneyMarket = artifacts.require("MarketMock");
const ERC20Mock = artifacts.require("ERC20Mock");

const { MAX_UINT256, ZERO_ADDRESS } = constants;

// const HALF_LIFE = new BN("10000000");
const MULTIPLIER = new BN("1000000000000000000");
// const HALF_LIFE = MULTIPLIER.mul(new BN("8750000"))
const HALF_LIFE = MULTIPLIER.mul(new BN("8750000000"));
const AMOUNT1 = MULTIPLIER.mul(new BN(100));
const AMOUNT2 = MULTIPLIER.mul(new BN(200));
const AMOUNT3 = MULTIPLIER.mul(new BN(300));
const AMOUNTS = [AMOUNT1, AMOUNT2, AMOUNT3];
const MAX_VALUE = MULTIPLIER.mul(new BN(10000));
const MAX_IFO_VALUE = HALF_LIFE.mul(new BN(60));
const ZERO = new BN(0);
const INTERVAL = new BN(60 * 60 * 24); // 24 HOURS

const ids = Array(10)
  .fill(10)
  .map((v, i) => v + i);

contract("AliceIFO", function([admin, user1, user2, user3, dummy]) {
  beforeEach(async function() {
    this.dai = await ERC20Mock.new("DAI", "DAI", 18);
    this.alice = await ERC20Mock.new("Alice", "ALICE", 18);
    this.fund = await AliceFund.new(this.alice.address);
    this.market = await MoneyMarket.new();

    await this.dai.mint(user1, MAX_VALUE);
    await this.dai.mint(user2, MAX_VALUE);
    await this.dai.mint(user3, MAX_VALUE);

    // await this.alice.mint(user3, AMOUNT1);
    await this.alice.mint(admin, MAX_IFO_VALUE);
    await this.alice.approve(this.fund.address, MAX_IFO_VALUE, { from: admin });

    const now = await time.latest();
    this.ifo = await AliceIFO.new(this.market.address, this.alice.address, this.fund.address, HALF_LIFE, INTERVAL, now.add(INTERVAL.div(new BN(2))));
    await this.fund.changeIFO(this.ifo.address);
    await this.fund.deposit(MAX_IFO_VALUE, { from: admin });

    this.users = [user1, user2, user3];
  });

  it("should get right values", async function() {
    let market = await this.ifo.getMoneyMarket();
    expect(market).to.be.equal(this.market.address);

    let alice = await this.ifo.getAliceToken();
    expect(alice).to.be.equal(this.alice.address);

    let fund = await this.ifo.getFund();
    expect(fund).to.be.equal(this.fund.address);

    let halfLife = await this.ifo.getHalfLife();
    expect(halfLife).to.be.bignumber.equal(HALF_LIFE);

    let interval = await this.ifo.getInterval();
    expect(interval).to.be.bignumber.equal(INTERVAL);
  });

  describe("with savings record", async function() {
    beforeEach(async function() {
      const now = await time.latest();
      for (let i = 0; i < 9; i++) {
        await this.market.setSavingsRecord(i, this.users[i % 3], AMOUNTS[Math.floor(i / 3)], now);
      }
    });

    it("should claim", async function() {
      let balance = await this.alice.balanceOf(user1);
      let totalClaims = await this.ifo.getTotalClaims(user1);

      expect(balance).to.be.bignumber.equal(ZERO);
      expect(totalClaims).to.be.bignumber.equal(ZERO);

      await time.increase(INTERVAL);

      let { logs } = await this.ifo.claim(0, { from: user1 });

      expectEvent.inLogs(logs, "Claimed", {
        user: user1,
        recordId: new BN(0),
        balance: AMOUNT1,
        amount: AMOUNT1
      });

      balance = await this.alice.balanceOf(user1);
      totalClaims = await this.ifo.getTotalClaims(user1);

      expect(balance).to.be.bignumber.equal(AMOUNT1);
      expect(totalClaims).to.be.bignumber.equal(AMOUNT1);

      let claims = await this.ifo.getClaims(user1);
      let claims2 = await this.ifo.getClaimsBySavings(0);

      expect(claims2).to.be.deep.equal(claims);

      let claimsbySavings = await this.ifo.getTotalClaimsBySavings(0);
      expect(claimsbySavings).to.be.bignumber.equal(AMOUNT1);
    });

    it("should claim multiple times", async function() {
      await time.increase(INTERVAL);
      const amount1 = await this.ifo.getClaimableAmount(3);
      await this.ifo.claim(3, { from: user1 });
      const time1 = await this.ifo.getLastClaimTimestamp(3);

      await time.increase(INTERVAL);
      const amount2 = await this.ifo.getClaimableAmount(3);
      await this.ifo.claim(3, { from: user1 });
      const time2 = await this.ifo.getLastClaimTimestamp(3);

      await time.increase(INTERVAL);
      const amount3 = await this.ifo.getClaimableAmount(3);
      await this.ifo.claim(3, { from: user1 });
      const time3 = await this.ifo.getLastClaimTimestamp(3);

      expect(amount1).to.be.bignumber.equal(amount2);
      expect(amount2).to.be.bignumber.equal(amount3);
      expect(time2).to.be.bignumber.gte(time1.add(INTERVAL));
      expect(time3).to.be.bignumber.gte(time2.add(INTERVAL));

      let balance = await this.alice.balanceOf(user1);
      let totalClaims = await this.ifo.getTotalClaims(user1);
      let totalClaimed = await this.ifo.totalClaimed();

      expect(balance).to.be.bignumber.equal(AMOUNT2.mul(new BN(3)));
      expect(totalClaims).to.be.bignumber.equal(AMOUNT2.mul(new BN(3)));
      expect(totalClaimed).to.be.bignumber.equal(AMOUNT2.mul(new BN(3)));
    });

    it("should not claim if IFO is not started", async function() {
      const startsAt = await this.ifo.getStartsAt();
      await time.increaseTo(startsAt.sub(new BN(1)));
      await expectRevert(this.ifo.claim(0, { from: user1 }), "IFO not started");
    });

    it("should not claim if recordId is invalid", async function() {
      await time.increase(INTERVAL);
      await expectRevert(this.ifo.claim(99, { from: user1 }), "invalid recordId");
    });

    it("should not claim if caller is not owner of the record", async function() {
      await time.increase(INTERVAL);
      await expectRevert(this.ifo.claim(0, { from: user2 }), "caller is not owner of this record");
    });

    it("should not claim if record has ZERO balance", async function() {
      const now = await time.latest();
      await this.market.setSavingsRecord(0, user1, 0, now);
      await time.increase(INTERVAL);
      await expectRevert(this.ifo.claim(0, { from: user1 }), "this record is not claimable");
    });

    it("should not claim if time is not passed", async function() {
      await time.increase(INTERVAL.div(new BN(2)));
      await expectRevert(this.ifo.claim(0, { from: user1 }), "time not passed");
    });

    context("halfLife", function() {
      beforeEach(async function() {
        const now = await time.latest();
        for (let i = 0; i < ids.length; i++) {
          await this.market.setSavingsRecord(ids[i], user1, HALF_LIFE.div(new BN(ids.length)), now);
        }
      });

      it.skip("full IFO", async function() {
        let round = MAX_UINT256;
        let balance = new BN(0);
        let amount = new BN(0);
        let count = 0;

        while (true) {
          let currentRound = await this.ifo.getClaimRound();
          let currentRate = await this.ifo.getClaimRate();

          if (!currentRound.eq(round)) {
            round = currentRound;
          }

          await time.increase(INTERVAL);
          let id = ids[count % ids.length];
          let { logs } = await this.ifo.claim(id, { from: user1 });

          const stepBalance = logs[0].args.balance;
          const stepAmount = logs[0].args.amount;

          const expectedAmount = stepBalance.mul(currentRate).div(MULTIPLIER);

          balance = balance.add(stepBalance);
          amount = amount.add(stepAmount);

          expect(expectedAmount).to.be.bignumber.equal(stepAmount);

          if (stepAmount.isZero()) {
            break;
          }

          count++;
        }

        const totalClaimed = await this.ifo.totalClaimed();

        console.log(balance.toString());
        console.log(amount.toString());
        console.log(totalClaimed.toString());
        console.log(MAX_IFO_VALUE.toString());
      });
    });
  });
});
