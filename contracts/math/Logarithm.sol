pragma solidity 0.5.8;

contract Logarithm {
    // @dev Calculate ln(x) where 2 >= x > 1
    // Using taylor series to 10th series
    function ln(int256 x) internal pure returns (int256) {
        int256 log = 0;
        while (x >= 1500000000000000000) {
            log = log + 405465108108164403;
            x = (x * 2) / 3;
        }
        x = x - 1000000000000000000;
        int256 y = x;
        int256 i = 1;

        while (i < 10) {
            log = log + ((y * 1000000000000000000) / (i * 1000000000000000000));
            i = i + 1;
            y = (y * x) / 1000000000000000000;
            log = log - ((y * 1000000000000000000) / (i * 1000000000000000000));
            i = i + 1;
            y = (y * x) / 1000000000000000000;
        }
        return log;
    }

    // @dev calculate log with predefined base
    // ex) logWithBase(4000000000000000000, 2000000000000000000, 693147180559945216)
    // is equal to log2(4)
    // @notice returns ZERO if x is less then base
    function logWithBase(int256 x, int256 base, int256 lnBase)
        internal
        pure
        returns (uint256)
    {
        int256 log = 0;
        while (x >= 2000000000000000000) {
            x = (x * 1000000000000000000) / base;
            log += 1000000000000000000;
        }

        log += (ln(x) * 1000000000000000000) / int256(lnBase);

        return uint256(log);
    }

    // @dev Calculate log_2(x)
    function log2(uint256 x) internal pure returns (uint256) {
        require(x == uint256(int256(x)), "cannot calculate");
        return logWithBase(int256(x), 2000000000000000000, 693147180559945216);
    }

    // @dev Calculate log_25(x)
    function log25(uint256 x) internal pure returns (uint256) {
        require(x == uint256(int256(x)), "cannot calculate");
        return
            logWithBase(int256(x), 25000000000000000000, 3218875824868199424);
    }
}
