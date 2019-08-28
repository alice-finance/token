pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./ERC20.sol";
import "../lib/SafeMath.sol";

contract LockedERC20 is ERC20 {
    using SafeMath for uint256;

    address private _owner;

    string public name;
    string public symbol;
    uint8 public decimals;

    struct TimeLock {
        address account;
        uint256 amount;
        uint256 timestamp;
    }

    TimeLock[] internal _timeLocks;

    mapping(address => uint256[]) internal _timeLocksOf;

    constructor(string memory _symbol, string memory _name, uint8 _decimals)
        public
    {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        _owner = msg.sender;
    }

    modifier onlyOwner() {
        require(isOwner(), "LockedERC20: caller is not owner");
        _;
    }

    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function timeLocks() public view returns (TimeLock[] memory) {
        return _timeLocks;
    }

    function lockedBalanceOf(address account) public view returns (uint256) {
        uint256[] storage ids = _timeLocksOf[account];
        uint256 balance = 0;

        for (uint256 i = 0; i < ids.length; i++) {
            if (_timeLocks[ids[i]].timestamp > now) {
                balance = balance.add(_timeLocks[ids[i]].amount);
            }
        }

        return balance;
    }

    function lockedTotalSupply() public view returns (uint256) {
        uint256 balance = 0;
        for (uint256 i = 0; i < _timeLocks.length; i++) {
            if (_timeLocks[i].timestamp > now) {
                balance = balance.add(_timeLocks[i].amount);
            }
        }

        return balance;
    }

    function unlockedBalanceOf(address account) public view returns (uint256) {
        return balanceOf(account).sub(lockedBalanceOf(account));
    }

    function transfer(address recipient, uint256 amount) public returns (bool) {
        require(
            unlockedBalanceOf(msg.sender) >= amount,
            "LockedERC20: transfer amount exceeds unlocked"
        );

        _decreaseAmount(msg.sender, amount);
        _increaseAmount(recipient, amount, 0);

        super.transfer(recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount)
        public
        returns (bool)
    {
        require(
            unlockedBalanceOf(sender) >= amount,
            "LockedERC20: transfer amount exceeds unlocked"
        );

        _decreaseAmount(sender, amount);
        _increaseAmount(recipient, amount, 0);

        super.transferFrom(sender, recipient, amount);
        return true;
    }

    function mint(address account, uint256 amount)
        public
        onlyOwner
        returns (bool)
    {
        return _mintWithLock(account, amount, 0);
    }

    function mintWithLock(address account, uint256 amount, uint256 releaseAfter)
        public
        onlyOwner
        returns (bool)
    {
        return _mintWithLock(account, amount, releaseAfter);
    }

    function burn(address account, uint256 amount)
        public
        onlyOwner
        returns (bool)
    {
        require(
            account != address(0),
            "LockedERC20: burn from the zero address"
        );

        _decreaseAmount(account, amount);

        _burn(account, amount);

        return false;
    }

    function _mintWithLock(
        address account,
        uint256 amount,
        uint256 releaseAfter
    ) internal returns (bool) {
        require(account != address(0), "LockedERC20: mint to the zero address");

        _increaseAmount(account, amount, releaseAfter);
        _mint(account, amount);

        return true;
    }

    function _decreaseAmount(address account, uint256 amount) internal {
        uint256[] storage ids = _timeLocksOf[account];

        uint256 totalDecreased = 0;
        uint256 remainingAmount = amount;

        for (uint256 i = 0; i < ids.length; i++) {
            if (_timeLocks[ids[i]].amount > 0) {
                if (_timeLocks[ids[i]].amount >= remainingAmount) {
                    _timeLocks[ids[i]].amount = _timeLocks[ids[i]].amount.sub(remainingAmount);
                    totalDecreased = totalDecreased.add(remainingAmount);
                    remainingAmount = 0;
                } else {
                    totalDecreased = totalDecreased.add(_timeLocks[ids[i]].amount);
                    remainingAmount = remainingAmount.sub(_timeLocks[ids[i]].amount);
                    _timeLocks[ids[i]].amount = 0;
                }
            }
        }

        // Should always satisfy this requirement!
        require(
            totalDecreased == amount,
            "LockedERC20: cannot decrease given amount"
        );
    }

    function _increaseAmount(
        address account,
        uint256 amount,
        uint256 releaseAfter
    ) internal {
        TimeLock memory lock = TimeLock(account, amount, releaseAfter);
        uint256 id = _timeLocks.length;
        _timeLocks.push(lock);
        _timeLocksOf[account].push(id);
    }
}
