pragma solidity 0.5.8;

import "../token/ERC20.sol";

contract ERC20Mock is ERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    address public owner;

    constructor(string memory _name, string memory _symbol, uint8 _decimals)
        public
    {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
