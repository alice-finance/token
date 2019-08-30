pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./IMoneyMarket.sol";

contract InvitationRepository {
    event InvitationCodeGenerated(
        address indexed account,
        bytes3 code,
        uint256 timestamp
    );
    event InvitationCodeUsed(
        address indexed inviter,
        bytes3 indexed code,
        address account,
        uint256 timestamp
    );

    IMoneyMarket private _market;
    uint256 private _amountPerInvitee;

    // inviter => code
    mapping(address => bytes3) private _codes;
    // code => inviter
    mapping(bytes3 => address) private _reverseCodes;
    // invitee = registered
    mapping(address => bool) private _registered;
    // invitee => inviter
    mapping(address => address) private _inviter;
    // inviter => invitees
    mapping(address => address[]) private _invitees;

    address[] private _inviterList;
    uint256 private _totalRegistered;

    constructor(address marketAddress, uint256 amountPerInvitee) public {
        _market = IMoneyMarket(marketAddress);
        _amountPerInvitee = amountPerInvitee;
    }

    function codeOf(address account) public view returns (bytes3) {
        return _codes[account];
    }

    function userOf(bytes3 code) public view returns (address) {
        return _reverseCodes[code];
    }

    function isRegistered(address account) public view returns (bool) {
        return _registered[account];
    }

    function inviter(address account) public view returns (address) {
        return _inviter[account];
    }

    function invitees(address account) public view returns (address[] memory) {
        return _invitees[account];
    }

    function inviteeCount(address account) public view returns (uint256) {
        return _invitees[account].length;
    }

    function maxInviteeCount(address account) public view returns (uint256) {
        IMoneyMarket.SavingsRecord[] memory records = _market.getSavingsRecords(
            account
        );

        if (records.length > 0) {
            uint256 totalSavings = 0;
            for (uint256 i = 0; i < records.length; i++) {
                totalSavings += records[i].balance;
            }

            return totalSavings / _amountPerInvitee;
        }

        return 0;
    }

    function totalRegistered() public view returns (uint256) {
        return _totalRegistered;
    }

    function totalInviterCount() public view returns (uint256) {
        return _inviterList.length;
    }

    function registerCode(bytes3 code) public returns (bool) {
        require(
            _registered[msg.sender] != true,
            "InviteCode: already registered"
        );
        address currentInviter = _reverseCodes[code];
        require(
            inviteeCount(currentInviter) < maxInviteeCount(currentInviter),
            "InviteCode: this code cannot be used"
        );

        _inviter[msg.sender] = currentInviter;
        _invitees[currentInviter].push(msg.sender);
        _registered[msg.sender] = true;

        _totalRegistered = _totalRegistered + 1;

        return true;
    }

    function generateCode() public returns (bytes3) {
        if (_codes[msg.sender] == bytes3(0)) {
            bytes3 code = bytes3(0);

            for (uint256 pos = 0; pos <= 34; pos++) {
                code = _generateCode(msg.sender, pos);
                if (_reverseCodes[code] == address(0) && code != bytes3(0)) {
                    _reverseCodes[code] = msg.sender;
                    _codes[msg.sender] = code;
                    _inviterList.push(msg.sender);

                    emit InvitationCodeGenerated(
                        msg.sender,
                        code,
                        block.timestamp
                    );
                    break;
                }
            }

            require(
                _codes[msg.sender] != bytes3(0),
                "InviteCote: all codes are duplicated"
            );
        }

        return _codes[msg.sender];
    }

    function _generateCode(address account, uint256 pos)
        private
        pure
        returns (bytes3)
    {
        return bytes3(bytes20(uint160(account) * uint160(2 ** (4 * pos))));
        // return bytes3(bytes20(account) << (4 * pos));
    }
}
