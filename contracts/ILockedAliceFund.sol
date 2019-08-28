pragma solidity 0.5.8;

interface ILockedAliceFund {
    event AliceDeposited(address from, uint256 amount, uint256 timestamp);
    event AliceWithdrawn(address to, uint256 amount, uint256 timestamp);
    event AliceLocked(
        address to,
        uint256 amount,
        uint256 releaseAfter,
        uint256 timestamp
    );
    event AliceUnlocked(address from, uint256 amount, uint256 timestamp);

    function lock(address account, uint256 amount, uint256 period)
        external
        returns (bool);
    function unlock(uint256 amount) external returns (bool);
    function unlockFor(address account, uint256 amount) external returns (bool);
}
