pragma solidity 0.5.8;

import "./token/IERC20.sol";
import "./IAliceFund.sol";

contract AliceFund is IAliceFund {
    address private _owner;
    IERC20 private _alice;
    address private _ifo;
    uint256 private _totalTransferred;

    event OwnershipTransferred(address indexed from, address indexed to);
    event IFOChanged(address indexed from, address indexed to);
    event AliceDeposited(address ifo, uint256 amount);
    event AliceTransferred(address indexed to, uint256 amount);

    constructor(address aliceAddress) public {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
        _alice = IERC20(aliceAddress);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function ifo() public view returns (address) {
        return _ifo;
    }

    modifier onlyOwner() {
        require(isOwner(), "caller is not owner");
        _;
    }

    modifier withIFO() {
        require(hasIFO(), "IFO is not setted");
        _;
    }

    modifier onlyIFO() {
        require(isIFO(), "caller is not ifo");
        _;
    }

    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    function hasIFO() public view returns (bool) {
        return _ifo != address(0);
    }

    function isIFO() public view returns (bool) {
        return msg.sender == _ifo;
    }

    function totalTransferred() public view returns (uint256) {
        return _totalTransferred;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "new owner is zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function changeIFO(address newIFO) public onlyOwner {
        require(newIFO != address(0), "new IFO is zero address");
        if (_ifo != address(0)) {
            _alice.approve(_ifo, 0);
        }

        _alice.approve(newIFO, _alice.balanceOf(address(this)));

        emit IFOChanged(_ifo, newIFO);

        _ifo = newIFO;
    }

    function deposit(uint256 amount) public onlyOwner withIFO {
        require(
            _alice.allowance(msg.sender, address(this)) >= amount,
            "allowance not met"
        );
        require(
            _alice.transferFrom(msg.sender, address(this), amount),
            "failed to transfer alice"
        );

        _alice.approve(_ifo, _alice.balanceOf(address(this)));

        emit AliceDeposited(_ifo, amount);
    }

    function transfer(address to, uint256 amount) public onlyIFO returns (bool) {
        _totalTransferred += amount;
        require(_alice.transfer(to, amount));
        emit AliceTransferred(to, amount);

        return true;
    }
}
