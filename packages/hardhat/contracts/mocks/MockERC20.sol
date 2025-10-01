// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Simple ERC20 token for testing purposes
 * @dev Mints initial supply to deployer
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _decimals = 6; // Default to 6 decimals like USDC
        _mint(msg.sender, 1000000 * 10 ** _decimals); // 1M tokens
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // Helper function for testing - allows minting more tokens
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
