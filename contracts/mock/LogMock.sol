pragma solidity 0.5.8;

import "../math/Logarithm.sol";

contract LogMock is Logarithm {
    function pLog25(uint256 x) public pure returns (uint256) {
        return super.log25(x);
    }
}
