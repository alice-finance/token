pragma solidity 0.5.8;

interface IAliceFund {
    function totalTransferred() external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}