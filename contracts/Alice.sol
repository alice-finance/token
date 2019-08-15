pragma solidity 0.5.8;

import "./token/ERC20.sol";

contract Alice is ERC20 {
    string public constant name = "Alice";
    string public constant symbol = "ALICE";
    uint8 public constant decimals = 18;

    uint256 public constant INITIAL_SUPPLY = 25000000000; // 25,000,000,000 ALICE

    constructor(address initialWallet) public {
        _totalSupply = INITIAL_SUPPLY * (10 ** uint256(decimals));
        _balances[initialWallet] = _totalSupply;
        emit Transfer(address(0), initialWallet, _totalSupply);
    }
}