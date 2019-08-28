pragma solidity 0.5.8;

import "./token/IERC20.sol";
import "./token/LockedERC20.sol";
import "./lib/SafeMath.sol";
import "./ILockedAliceFund.sol";

contract LockedAliceFund is ILockedAliceFund {
    using SafeMath for uint256;
    address private _owner;
    uint256 private _balance;
    IERC20 private _alice;
    LockedERC20 private _lockedAlice;

    event OwnershipTransferred(address indexed from, address indexed to);

    constructor(address aliceAddress) public {
        _alice = IERC20(aliceAddress);
        _lockedAlice = new LockedERC20("LAX", "Locked Alice", 18);
        _owner = msg.sender;
    }

    modifier onlyOwner() {
        require(isOwner(), "LockedAliceFund: caller is not owner");
        _;
    }

    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function alice() public view returns (IERC20) {
        return _alice;
    }

    function lockedAlice() public view returns (LockedERC20) {
        return _lockedAlice;
    }

    function balance() public view returns (uint256) {
        return _balance;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "LockedAliceFund: new owner is zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    function deposit(uint256 amount) public onlyOwner {
        alice().transferFrom(msg.sender, address(this), amount);
        _balance = _balance.add(amount);

        emit AliceDeposited(msg.sender, amount, block.timestamp);
    }

    function withdraw(uint256 amount) public onlyOwner {
        require(
            _balance >= amount,
            "LockedAliceFund: insufficient ALICE to withdraw"
        );
        alice().transfer(msg.sender, amount);
        _balance = _balance.sub(amount);

        emit AliceWithdrawn(msg.sender, amount, block.timestamp);
    }

    function lock(address account, uint256 amount, uint256 period)
        public
        onlyOwner
        returns (bool)
    {
        require(_balance >= amount, "LockedAliceFund: insufficient ALICE to lock");

        _balance = _balance.sub(amount);

        lockedAlice().mintWithLock(account, amount, period);

        emit AliceLocked(account, amount, period, block.timestamp);
        return true;
    }

    function unlock(uint256 amount) public returns (bool) {
        return _unlockFor(msg.sender, amount);
    }

    function unlockFor(address account, uint256 amount)
        public
        onlyOwner
        returns (bool)
    {
        return _unlockFor(account, amount);
    }

    function _unlockFor(address account, uint256 amount)
        internal
        returns (bool)
    {
        require(
            lockedAlice().unlockedBalanceOf(account) >= amount,
            "LockedAliceFund: insufficient Locked ALICE"
        );

        lockedAlice().burn(account, amount);
        alice().transfer(account, amount);

        emit AliceUnlocked(account, amount, block.timestamp);

        return true;
    }
}
