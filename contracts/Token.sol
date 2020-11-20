pragma solidity ^0.5.0;

import "./ERC20.sol";
import "./libs/ECRecovery.sol";

contract Token is ERC20 {
    using SafeMath for uint256;
    using ECRecovery for bytes32;

    string public name;
    string public symbol;
    uint8 public decimals;

    mapping(address => mapping(uint256 => bool)) nonceUsed;

    event Settled(address _from, address _to, uint256 _amount);

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) public {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;

        _mint(msg.sender, 10000 * 10**uint256(decimals));
    }

    function settle(
        address from,
        address to,
        uint256 amount,
        uint256 nonce,
        bytes calldata signedMessageSpender,
        bytes calldata signedMessageReceiver
    ) external {
        require(!nonceUsed[from][nonce], "Payment already settled");

        require(
            isValidSignature(
                from,
                to,
                amount,
                nonce,
                from,
                signedMessageSpender
            ),
            "Invalid sender signature"
        );
        require(
            isValidSignature(
                from,
                to,
                amount,
                nonce,
                to,
                signedMessageReceiver
            ),
            "Invalid receiver signature"
        );

        nonceUsed[from][nonce] = true;
        emit Settled(from, to, amount);

        //transfer will check for the balances
        _transfer(from, to, amount);
    }

    function isValidSignature(
        address from,
        address to,
        uint256 amount,
        uint256 nonce,
        address signer,
        bytes memory signedMessage
    ) public pure returns (bool) {
        bytes32 message = prefixed(
            keccak256(abi.encodePacked(from, to, amount, nonce))
        );
        return message.recover(signedMessage) == signer;
    }

    /**
     * @dev Builds a prefixed hash to mimic the behavior of eth_sign
     * @param _hash bytes32 Message hash to be prefixed
     */
    function prefixed(bytes32 _hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
            );
    }
}
