// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { StrategyBase } from "../StrategyBase.sol";

/**
 * @title MockYieldStrategy
 * @notice Minimal demo strategy:
 *         - Funds stay idle (no external protocol).
 *         - `drip(amount)` (onlyOwner) pulls underlying tokens into the strategy,
 *           simulating harvested rewards -> raises share price.
 *         - Vault remains the only party allowed to deposit/withdraw (via BaseStrategy).
 *
 * @dev This strategy is intentionally trivial for hackathon demos.
 *      Liquidity is always available because assets remain idle in the contract.
 */
contract MockYieldStrategy is StrategyBase {
    using SafeERC20 for IERC20;

    event Dripped(uint256 amount, uint256 totalAssetsAfter);

    constructor(
        IERC20 asset_,
        address vault_,
        address owner_
    )
        StrategyBase(
            asset_,
            string(abi.encodePacked("Mock ", IERC20Metadata(address(asset_)).name(), " Strategy")),
            string(abi.encodePacked("m", IERC20Metadata(address(asset_)).symbol(), "STRAT")),
            vault_,
            owner_
        )
    {}

    // -----------------------------------------
    // Yield simulation helpers (onlyOwner)
    // -----------------------------------------

    /**
     * @notice Simulate yield by transferring `amount` of the underlying asset
     *         from the owner to this contract (must approve first).
     *         No new shares are minted, so pricePerShare increases.
     */
    function drip(uint256 amount) external onlyOwner {
        require(amount > 0, "amount=0");
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);
        emit Dripped(amount, totalAssets());
    }

    /**
     * @notice (Optional) Simulate loss or fee by sending assets out.
     *         Use cautiously—this reduces share price.
     */
    function skim(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "to=0");
        IERC20(asset()).safeTransfer(to, amount);
        // no event needed; visible on-chain
    }

    // -----------------------------------------
    // Strategy hooks (all trivial/no-op)
    // -----------------------------------------

    // Funds stay idle, so nothing to deploy.
    function _deployFunds(uint256 /*assets*/) internal virtual override {
        // no-op
    }

    // Liquidity is already here. Return min(requested, balance).
    function _freeFunds(uint256 assets) internal virtual override returns (uint256 freed) {
        uint256 bal = IERC20(asset()).balanceOf(address(this));
        return assets >= bal ? bal : assets;
    }

    // Nothing deployed externally; all assets are idle here.
    function _totalDeployed() internal view virtual override returns (uint256) {
        return 0;
    }

    // No external rewards process; yield is injected via `drip`.
    function _harvest() internal virtual override returns (int256) {
        return int256(0);
    }
}
