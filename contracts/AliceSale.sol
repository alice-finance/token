pragma solidity 0.5.8;
import "./token/IERC20.sol";
import "./ILockedAliceFund.sol";
import "./lib/SafeMath.sol";

contract AliceSale {
    using SafeMath for uint256;

    address private _owner;
    ILockedAliceFund private _locker;
    IERC20 private _alice;
    IERC20 private _dai;
    uint256 private _ratio;
    uint256 private _daiRaised;
    uint256 private _aliceSold;

    event OwnershipTransferred(address indexed from, address indexed to);
    event AlicePurchased(
        address indexed user,
        uint256 daiAmount,
        uint256 aliceAmount,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(isOwner(), "AliceSale: caller is not owner");
        _;
    }

    constructor(
        address aliceAddress,
        address daiAddress,
        address lockerAddress,
        uint256 ratio
    ) public {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
        _locker = ILockedAliceFund(lockerAddress);
        _alice = IERC20(aliceAddress);
        _dai = IERC20(daiAddress);
        _ratio = ratio;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function locker() public view returns (ILockedAliceFund) {
        return _locker;
    }

    function alice() public view returns (IERC20) {
        return _alice;
    }

    function dai() public view returns (IERC20) {
        return _dai;
    }

    function ratio() public view returns (uint256) {
        return _ratio;
    }

    function daiRaised() public view returns (uint256) {
        return _daiRaised;
    }

    function aliceSold() public view returns (uint256) {
        return _aliceSold;
    }

    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "AliceSale: new owner is zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    function buyAlice(uint256 amount) public returns (bool) {
        return _buyAliceFor(msg.sender, amount);
    }

    function buyAliceFor(address beneficiary, uint256 amount)
        public
        returns (bool)
    {
        return _buyAliceFor(beneficiary, amount);
    }

    function withdraw(uint256 amount) public onlyOwner {
        require(
            dai().balanceOf(address(this)) >= amount,
            "AliceSale: insufficient DAI"
        );

        dai().transfer(msg.sender, amount);
    }

    function _buyAliceFor(address beneficiary, uint256 amount)
        internal
        returns (bool)
    {
        require(amount > 0, "AliceSale: DAI amount is ZERO");
        require(
            beneficiary != address(0),
            "AliceSale: beneficiary is ZERO_ADDRESS"
        );

        require(
            dai().allowance(msg.sender, address(this)) >= amount,
            "AliceSale: DAI amount exceeds allowance"
        );

        require(
            dai().balanceOf(msg.sender) >= amount,
            "AliceSale: DAI amount exceeds balance"
        );

        uint256 aliceAmount = amount.mul(_ratio);

        _daiRaised = _daiRaised.add(amount);
        _aliceSold = _aliceSold.add(aliceAmount);

        dai().transferFrom(msg.sender, address(this), amount);
        locker().unlock(aliceAmount);
        alice().transfer(beneficiary, aliceAmount);

        emit AlicePurchased(msg.sender, amount, aliceAmount, block.timestamp);

        return true;
    }
}
