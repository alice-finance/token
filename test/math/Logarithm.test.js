const { BN } = require("openzeppelin-test-helpers");
const { expect } = require("chai");

const Log = artifacts.require("mock/LogMock.sol");

const TOLERANCE = new BN("10000");

contract("Logarithm", function() {
  beforeEach(async function() {
    this.log = await Log.new();
  });

  it("test", async function() {
    expect(await testLog25(this.log, new BN("24000000000000000000"), new BN("987317934353082163"))).to.be.true;
    expect(await testLog25(this.log, new BN("25000000000000000000"), new BN("1000000000000000000"), true)).to.be.true;
    expect(await testLog25(this.log, new BN("26000000000000000000"), new BN("1012184599620237516"))).to.be.true;
    expect(await testLog25(this.log, new BN("624000000000000000000"), new BN("1999502533973320192"))).to.be.true;
    expect(await testLog25(this.log, new BN("625000000000000000000"), new BN("2000000000000000000"), true)).to.be.true;
    expect(await testLog25(this.log, new BN("626000000000000000000"), new BN("2000496670716945664"))).to.be.true;
    expect(await testLog25(this.log, new BN("15624000000000000000000"), new BN("2999980116645820416"))).to.be.true;
    expect(await testLog25(this.log, new BN("15625000000000000000000"), new BN("3000000000000000000"), true)).to.be.true;
    expect(await testLog25(this.log, new BN("15626000000000000000000"), new BN("3000019882081687040"))).to.be.true;
    expect(await testLog25(this.log, new BN("390624000000000000000000"), new BN("3999999204690265600"))).to.be.true;
    expect(await testLog25(this.log, new BN("390625000000000000000000"), new BN("4000000000000000000"), true)).to.be.true;
    expect(await testLog25(this.log, new BN("390626000000000000000000"), new BN("4000000795307699200"))).to.be.true;
  });
});

const testLog25 = async (c, x, expected, exact = false) => {
  const result = await c.pLog25(x);
  if (exact) {
    return result.eq(expected);
  } else {
    return testTolerance(TOLERANCE, result, expected);
  }
};

const testTolerance = (t, x, y) => {
  return t.gte(x.sub(y).abs());
};
