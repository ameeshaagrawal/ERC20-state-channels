pragma solidity ^0.5.0;

import "./ERC20.sol";

contract Token is ERC20 {
    using SafeMath for uint256;

    string public name;
    string public symbol;
    uint8 public decimals;

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
}
