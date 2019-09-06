pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./AliceIFO.sol";
import "./lib/SafeMath.sol";
import "./money-market/ISavings.sol";
import "./money-market/IInvitationManager.sol";

contract AliceIFOWithInvitation is AliceIFO {
    using SafeMath for uint256;

    AliceIFO internal _previousIFO;
    uint256 internal _logBase;

    constructor(
        address marketAddress,
        address previousAddress,
        address aliceAddress,
        address fundAddress,
        uint256 halfLife,
        uint256 interval,
        uint256 logBase,
        uint256 startsAt
    ) public {
        _market = marketAddress;
        _previousIFO = AliceIFO(previousAddress);
        _alice = aliceAddress;
        _fund = IAliceFund(fundAddress);
        _halfLife = halfLife;
        _interval = interval;
        _logBase = logBase;
        _startsAt = startsAt;
    }

    function logBase() public view returns (uint256) {
        return _logBase;
    }

    function totalClaimed() public view returns (uint256) {
        uint256 beforeAmount = _previousIFO.totalClaimed();
        return beforeAmount += _totalClaimed;
    }

    function claim(uint256 recordId) public isStarted returns (bool) {
        ISavings.SavingsRecord memory record = ISavings(_market)
            .getSavingsRecordWithData(recordId, new bytes(0));

        require(
            record.owner == msg.sender,
            "caller is not owner of this record"
        );
        require(record.balance > 0, "this record is not claimable");

        if (_lastClaimTimestamp[msg.sender][recordId] == 0) {
            _lastClaimTimestamp[msg.sender][recordId] = record.initialTimestamp;
        }

        require(
            (block.timestamp.sub(_lastClaimTimestamp[msg.sender][recordId]))
                    .div(_interval) >=
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
        claimRecord.amount = _getClaimAmount(msg.sender, record.balance);
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
        ClaimRecord[] memory before = _previousIFO.getClaims(user);
        uint256 totalLength = before.length + _userClaimList[user].length;
        ClaimRecord[] memory result = new ClaimRecord[](totalLength);

        for (uint256 i = 0; i < totalLength; i++) {
            if (i < before.length) {
                result[i] = before[i];
            } else {
                result[i] = _claimList[_userClaimList[user][i - before.length]];
            }
        }

        return result;
    }

    function getTotalClaims(address user) public view returns (uint256) {
        uint256 beforeAmount = _previousIFO.getTotalClaims(user);
        return beforeAmount + _userTotalClaimAmount[user];
    }

    function getClaimsBySavings(uint256 recordId)
        public
        view
        returns (ClaimRecord[] memory)
    {
        ClaimRecord[] memory before = _previousIFO.getClaimsBySavings(recordId);
        uint256 totalLength = before.length + _recordClaimList[recordId].length;
        ClaimRecord[] memory result = new ClaimRecord[](totalLength);

        for (uint256 i = 0; i < totalLength; i++) {
            if (i < before.length) {
                result[i] = before[i];
            } else {
                result[i] = _claimList[_recordClaimList[recordId][i -
                    before.length]];
            }
        }

        return result;
    }

    function getTotalClaimsBySavings(uint256 recordId)
        public
        view
        returns (uint256)
    {
        uint256 beforeAmount = _previousIFO.getTotalClaimsBySavings(recordId);
        return beforeAmount + _recordTotalClaimAmount[recordId];
    }

    function getLastClaimTimestamp(uint256 recordId)
        public
        view
        returns (uint256)
    {
        ISavings.SavingsRecord memory record = ISavings(_market)
            .getSavingsRecordWithData(recordId, new bytes(0));

        return _lastClaimTimestamp[record.owner][recordId];
    }

    function getClaimableAmount(uint256 recordId)
        public
        view
        returns (uint256)
    {
        ISavings.SavingsRecord memory record = ISavings(_market)
            .getSavingsRecordWithData(recordId, new bytes(0));

        return _getClaimAmount(msg.sender, record.balance);
    }

    function getClaimRate() public view returns (uint256) {
        return _getClaimRate();
    }

    function getClaimRound() public view returns (uint256) {
        return _getClaimRound();
    }

    function _getClaimAmount(address user, uint256 balance)
        internal
        view
        returns (uint256)
    {
        if (balance == 0) {
            return 0;
        }

        uint256 rate = _getClaimRate();
        uint256 claimable = _getClaimableAmount(user, balance);

        return claimable.mul(rate).div(10 ** 18);
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

    function _getClaimableAmount(address account, uint256 balance)
        internal
        view
        returns (uint256)
    {
        if (IInvitationManager(_market).redeemerCount(account) > 0) {
            uint256 total = 0;
            address[] memory redeemers = IInvitationManager(_market).redeemers(
                account
            );

            for (uint256 i = 0; i < redeemers.length; i++) {
                total = total + _getSavingsBalanceOf(redeemers[i]);
            }

            if (total > balance) {
                uint256 r = _calculateLog(total, _logBase);
                if (r > MULTIPLIER) {
                    return balance.mul(r).div(MULTIPLIER);
                }
            }
        }

        return balance;
    }

    function _getSavingsBalanceOf(address account)
        internal
        view
        returns (uint256)
    {
        ISavings.SavingsRecord[] memory records = ISavings(_market)
            .getSavingsRecordsWithData(account, new bytes(0));
        uint256 total = 0;
        for (uint256 i = 0; i < records.length; i++) {
            total = total + records[i].balance;
        }

        return total;
    }

    function _calculateLog(uint256 value, uint256 base)
        internal
        pure
        returns (uint256)
    {
        // TODO: Should implement this
        return MULTIPLIER;
    }
}
