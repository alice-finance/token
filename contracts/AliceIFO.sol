pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./money-market/IMoneyMarket.sol";
import "./IAliceFund.sol";
import "./lib/SafeMath.sol";
import "./token/IERC20.sol";

contract AliceIFO {
    using SafeMath for uint256;

    uint256 internal constant MULTIPLIER = 10 ** 18;

    struct ClaimRecord {
        address user;
        uint256 claimId;
        uint256 recordId;
        uint256 balance;
        uint256 amount;
        uint256 timestamp;
    }

    uint256 internal _halfLife;
    uint256 internal _interval;
    address internal _market;
    address internal _alice;
    IAliceFund internal _fund;
    uint256 internal _startsAt;

    ClaimRecord[] internal _claimList;
    // mapping (user => recordId => round => isClaimed)
    mapping(address => mapping(uint256 => uint256)) internal _lastClaimTimestamp;
    // mapping (user => claimIndex[])
    mapping(address => uint256[]) internal _userClaimList;
    // mapping (user => claimedAmount)
    mapping(address => uint256) internal _userTotalClaimAmount;
    // mapping (recordId => claimIndex[])
    mapping(uint256 => uint256[]) internal _recordClaimList;
    // mapping (recordId => claimedAmount)
    mapping(uint256 => uint256) internal _recordTotalClaimAmount;

    uint256 internal _totalClaimed = 0;

    event Claimed(
        address indexed user,
        uint256 claimId,
        uint256 recordId,
        uint256 balance,
        uint256 amount,
        uint256 timestamp
    );

    constructor(
        address marketAddress,
        address aliceAddress,
        address fundAddress,
        uint256 halfLife,
        uint256 interval,
        uint256 startsAt
    ) public {
        _market = marketAddress;
        _alice = aliceAddress;
        _fund = IAliceFund(fundAddress);
        _halfLife = halfLife;
        _interval = interval;
        _startsAt = startsAt;
    }

    modifier isStarted() {
        require(block.timestamp >= _startsAt, "IFO not started");
        _;
    }

    function getStartsAt() public view returns (uint256) {
        return _startsAt;
    }

    function getMoneyMarket() public view returns (address) {
        return _market;
    }

    function getAliceToken() public view returns (address) {
        return _alice;
    }

    function getFund() public view returns (address) {
        return address(_fund);
    }

    function getHalfLife() public view returns (uint256) {
        return _halfLife;
    }

    function getInterval() public view returns (uint256) {
        return _interval;
    }

    function totalClaimed() public view returns (uint256) {
        return _totalClaimed;
    }

    function claim(uint256 recordId) public isStarted returns (bool) {
        IMoneyMarket.SavingsRecord memory record = IMoneyMarket(_market)
            .getSavingsRecord(recordId);

        require(
            record.owner == msg.sender,
            "caller is not owner of this record"
        );
        require(record.balance > 0, "this record is not claimable");

        if (_lastClaimTimestamp[msg.sender][recordId] == 0) {
            _lastClaimTimestamp[msg.sender][recordId] = record.initialTimestamp;
        }

        require(
            (block.timestamp.sub(_lastClaimTimestamp[msg.sender][recordId])).div(_interval) >=
                1,
            "time not passed"
        );

        uint256 claimId = _claimList.length;
        _claimList.length += 1;
        ClaimRecord storage claimRecord = _claimList[claimId];
        claimRecord.user = msg.sender;
        claimRecord.recordId = record.id;
        claimRecord.claimId = claimId;
        claimRecord.balance = record.balance;
        claimRecord.amount = _getClaimAmount(record.balance);
        claimRecord.timestamp = block.timestamp;

        _userClaimList[msg.sender].push(claimId);
        _userTotalClaimAmount[msg.sender] += claimRecord.amount;
        _recordClaimList[recordId].push(claimId);
        _recordTotalClaimAmount[recordId] += claimRecord.amount;
        _totalClaimed += claimRecord.amount;

        _lastClaimTimestamp[msg.sender][recordId] = block.timestamp;

        require(
            _fund.transfer(msg.sender, claimRecord.amount),
            "cannot transfer claimed"
        );

        emit Claimed(
            claimRecord.user,
            claimRecord.claimId,
            claimRecord.recordId,
            claimRecord.balance,
            claimRecord.amount,
            claimRecord.timestamp
        );

        return true;
    }

    function getClaims(address user)
        public
        view
        returns (ClaimRecord[] memory)
    {
        ClaimRecord[] memory result = new ClaimRecord[](
            _userClaimList[user].length
        );

        for (uint256 i = 0; i < _userClaimList[user].length; i++) {
            result[i] = _claimList[_userClaimList[user][i]];
        }

        return result;
    }

    function getTotalClaims(address user) public view returns (uint256) {
        return _userTotalClaimAmount[user];
    }

    function getClaimsBySavings(uint256 recordId)
        public
        view
        returns (ClaimRecord[] memory)
    {
        ClaimRecord[] memory result = new ClaimRecord[](
            _recordClaimList[recordId].length
        );

        for (uint256 i = 0; i < _recordClaimList[recordId].length; i++) {
            result[i] = _claimList[_recordClaimList[recordId][i]];
        }

        return result;
    }

    function getTotalClaimsBySavings(uint256 recordId)
        public
        view
        returns (uint256)
    {
        return _recordTotalClaimAmount[recordId];
    }

    function getLastClaimTimestamp(uint256 recordId)
        public
        view
        returns (uint256)
    {
        IMoneyMarket.SavingsRecord memory record = IMoneyMarket(_market)
            .getSavingsRecord(recordId);

        return _lastClaimTimestamp[record.owner][recordId];
    }

    function getClaimableAmount(uint256 recordId)
        public
        view
        returns (uint256)
    {
        IMoneyMarket.SavingsRecord memory record = IMoneyMarket(_market)
            .getSavingsRecord(recordId);

        return _getClaimAmount(record.balance);
    }

    function getClaimRate() public view returns (uint256) {
        return _getClaimRate();
    }

    function getClaimRound() public view returns (uint256) {
        return _getClaimRound();
    }

    function _getClaimAmount(uint256 balance) internal view returns (uint256) {
        if (balance == 0) {
            return 0;
        }

        uint256 rate = _getClaimRate();

        return balance.mul(rate).div(10 ** 18);
    }

    function _getClaimRate() public view returns (uint256) {
        uint256 round = _getClaimRound();
        uint256 one = 10 ** 18;
        for (uint256 i = 0; i < round; i++) {
            one = one / 2;
        }

        return one;
    }

    function _getClaimRound() internal view returns (uint256) {
        uint256 funds = _fund.totalTransferred();
        uint256 halfLife = _halfLife;
        uint256 round = 0;

        while (funds >= halfLife) {
            funds -= halfLife;
            halfLife = halfLife / 2;
            round += 1;
        }

        return round;
    }
}
