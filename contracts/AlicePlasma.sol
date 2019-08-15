pragma solidity 0.5.8;

import "./token/ERC20.sol";

contract AlicePlasma is ERC20 {
    address public gateway;

    string public constant name = "Alice";
    string public constant symbol = "ALICE";
    uint8 public constant decimals = 18;

    constructor(address gatewayAddress) public {
        gateway = gatewayAddress;
        _totalSupply = 0;
    }

    function mintToGateway(uint256 amount) public {
        require(msg.sender == gateway, "only the gateway is allowed to mint");

        _totalSupply = _totalSupply.add(amount);
        _balances[gateway] = _balances[gateway].add(amount);
        emit Transfer(address(0), gateway, amount);
    }
}