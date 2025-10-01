// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IERC20, ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Vault (ERC-4626)
 * @notice Enhanced Vault with strategy fund management:
 *         - Users deposit base token (USDC) and receive shares
 *         - Owner can register/unregister strategy addresses and set allocations
 *         - Automatically deploys funds to strategies based on target allocations
 *         - Withdraws from strategies when users redeem shares
 *         - Emergency shutdown disables deposits/mints but keeps withdrawals/redemptions open
 *
 * @dev Assumes the underlying `asset` is a standard ERC20 (e.g., USDC with 6 decimals).
 *      Uses OZ ERC-4626 for accounting and share pricing.
 */
contract USDCVault is ERC4626, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Strategy management ---
    struct StrategyInfo {
        uint256 targetAllocation; // Basis points (10000 = 100%)
        uint256 totalDeposited; // Total assets deposited to this strategy
        bool isActive; // Whether strategy is active
    }

    address[] private _strategies;
    mapping(address => StrategyInfo) public strategyInfo;

    // Total allocation must not exceed 10000 basis points (100%)
    uint256 public totalAllocation;

    // Minimum amount to keep in vault for gas optimization and quick withdrawals
    uint256 public minLiquidity = 1e6; // 1000 USDC (6 decimals)

    // --- Events ---
    event StrategyAdded(address indexed strategy, uint256 targetAllocation);
    event StrategyRemoved(address indexed strategy);
    event StrategyAllocationUpdated(address indexed strategy, uint256 oldAllocation, uint256 newAllocation);
    event FundsDeployedToStrategy(address indexed strategy, uint256 amount);
    event FundsWithdrawnFromStrategy(address indexed strategy, uint256 amount);
    event StrategyHarvested(address indexed strategy, int256 pnl);
    event EmergencyShutdownUpdated(bool paused);

    // --- Constructor ---
    constructor(
        ERC20 baseToken_,
        string memory name_,
        string memory symbol_,
        address owner_
    ) ERC20(name_, symbol_) ERC4626(baseToken_) Ownable(owner_) {
        // No-op; ERC4626 handles decimals via underlying asset.
    }

    /**
     * @notice Toggle emergency shutdown (pauses deposits/mints).
     *         Withdraws/redemptions remain enabled so users can exit.
     */
    function setEmergencyShutdown(bool shutdown) external onlyOwner {
        if (shutdown) _pause();
        else _unpause();
        emit EmergencyShutdownUpdated(shutdown);
    }

    /**
     * @notice Add a strategy address to the registry with target allocation.
     * @param strategy The strategy contract address
     * @param targetAllocation Target allocation in basis points (10000 = 100%)
     * @dev In a full implementation, you'd validate ERC-4626/asset compatibility here.
     */
    function addStrategy(address strategy, uint256 targetAllocation) external onlyOwner {
        require(strategy != address(0), "invalid strategy");
        require(!strategyInfo[strategy].isActive, "already added");
        require(targetAllocation <= 10000, "allocation > 100%");
        require(totalAllocation + targetAllocation <= 10000, "total allocation > 100%");

        strategyInfo[strategy] = StrategyInfo({
            targetAllocation: targetAllocation,
            totalDeposited: 0,
            isActive: true
        });

        totalAllocation += targetAllocation;
        _strategies.push(strategy);

        // Approve strategy to spend vault's tokens for ERC4626 flows
        IERC20(asset()).approve(strategy, type(uint256).max);

        emit StrategyAdded(strategy, targetAllocation);
    }

    /**
     * @notice Remove a strategy address from the registry.
     * @dev This will emergency withdraw all funds from the strategy first.
     */
    function removeStrategy(address strategy) external onlyOwner {
        require(strategyInfo[strategy].isActive, "not a strategy");

        // Emergency withdraw all funds from strategy first
        if (strategyInfo[strategy].totalDeposited > 0) {
            _emergencyWithdrawFromStrategy(strategy);
        }

        uint256 oldAllocation = strategyInfo[strategy].targetAllocation;
        totalAllocation -= oldAllocation;
        strategyInfo[strategy].isActive = false;

        // Remove approval
        IERC20(asset()).approve(strategy, 0);

        // swap & pop for O(1) removal
        uint256 len = _strategies.length;
        for (uint256 i = 0; i < len; i++) {
            if (_strategies[i] == strategy) {
                if (i != len - 1) {
                    _strategies[i] = _strategies[len - 1];
                }
                _strategies.pop();
                emit StrategyRemoved(strategy);
                return;
            }
        }

        // Should not hit here because strategyInfo[strategy].isActive was true
        revert("remove failed");
    }

    /**
     * @notice Update target allocation for a strategy.
     */
    function updateStrategyAllocation(address strategy, uint256 newAllocation) external onlyOwner {
        require(strategyInfo[strategy].isActive, "not a strategy");
        require(newAllocation <= 10000, "allocation > 100%");

        uint256 oldAllocation = strategyInfo[strategy].targetAllocation;
        totalAllocation = totalAllocation - oldAllocation + newAllocation;
        require(totalAllocation <= 10000, "total allocation > 100%");

        strategyInfo[strategy].targetAllocation = newAllocation;
        emit StrategyAllocationUpdated(strategy, oldAllocation, newAllocation);
    }

    /**
     * @notice Read-only: full list of strategy addresses.
     */
    function getStrategies() external view returns (address[] memory) {
        return _strategies;
    }

    /**
     * @notice Check if an address is an active strategy.
     */
    function isStrategy(address strategy) external view returns (bool) {
        return strategyInfo[strategy].isActive;
    }

    // ============ Enhanced ERC4626 with Strategy Integration ============

    /**
     * @notice Enhanced totalAssets that includes assets deployed to strategies.
     */
    function totalAssets() public view override returns (uint256) {
        uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
        uint256 strategyAssets = 0;

        for (uint256 i = 0; i < _strategies.length; i++) {
            address strategy = _strategies[i];
            if (strategyInfo[strategy].isActive) {
                // Get total assets from strategy (includes their deployed funds + idle funds)
                try ERC4626(strategy).totalAssets() returns (uint256 assets) {
                    strategyAssets += assets;
                } catch {
                    // If strategy call fails, use our recorded deposit amount
                    strategyAssets += strategyInfo[strategy].totalDeposited;
                }
            }
        }

        return vaultBalance + strategyAssets;
    }

    /**
     * @notice Deploy excess funds to strategies according to target allocations.
     */
    function rebalance() external onlyOwner nonReentrant {
        _autoDeployFunds();
    }

    /**
     * @notice Harvest yields from all strategies.
     */
    function harvestAll() external onlyOwner nonReentrant returns (int256 totalPnl) {
        for (uint256 i = 0; i < _strategies.length; i++) {
            address strategy = _strategies[i];
            if (strategyInfo[strategy].isActive) {
                try this.harvestStrategy(strategy) returns (int256 pnl) {
                    totalPnl += pnl;
                } catch {
                    // Continue with other strategies if one fails
                }
            }
        }
    }

    /**
     * @notice Harvest yield from a specific strategy.
     */
    function harvestStrategy(address strategy) external onlyOwner nonReentrant returns (int256 pnl) {
        require(strategyInfo[strategy].isActive, "not a strategy");

        // Call harvest on the strategy
        try ERC4626(strategy).totalAssets() returns (uint256 assetsBefore) {
            // Try to call harvest if strategy implements it
            (bool success, bytes memory data) = strategy.call(abi.encodeWithSignature("harvest()"));

            if (success && data.length >= 32) {
                pnl = abi.decode(data, (int256));
            } else {
                // If no harvest method, just check for balance changes
                uint256 assetsAfter = ERC4626(strategy).totalAssets();
                pnl = int256(assetsAfter) - int256(assetsBefore);
            }

            emit StrategyHarvested(strategy, pnl);
        } catch {
            pnl = 0;
        }
    }

    // ============ Internal Strategy Management ============

    /**
     * @notice Internal function to deposit assets to a strategy.
     */
    function _depositToStrategy(address strategy, uint256 amount) internal {
        require(strategyInfo[strategy].isActive, "not active strategy");
        require(amount > 0, "zero amount");

        uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
        require(vaultBalance >= amount, "insufficient vault balance");

        IERC20(asset()).approve(strategy, amount);
        // Deposit to strategy using ERC4626 interface
        try ERC4626(strategy).deposit(amount, address(this)) returns (uint256 shares) {
            strategyInfo[strategy].totalDeposited += amount;
            emit FundsDeployedToStrategy(strategy, amount);
            shares; // silence unused variable warning
        } catch {
            revert("strategy deposit failed");
        }
    }

    /**
     * @notice Internal function to withdraw assets from a strategy.
     */
    function _withdrawFromStrategy(address strategy, uint256 amount) internal returns (uint256 actualWithdrawn) {
        require(strategyInfo[strategy].isActive, "not active strategy");
        require(amount > 0, "zero amount");

        uint256 balanceBefore = IERC20(asset()).balanceOf(address(this));

        // Calculate shares to redeem based on current strategy exchange rate
        try ERC4626(strategy).previewWithdraw(amount) returns (uint256 shares) {
            // Check our share balance in the strategy
            uint256 ourShares = IERC20(strategy).balanceOf(address(this));
            if (shares > ourShares) {
                shares = ourShares; // Withdraw all available shares
            }

            // Withdraw from strategy
            ERC4626(strategy).redeem(shares, address(this), address(this));

            uint256 balanceAfter = IERC20(asset()).balanceOf(address(this));
            actualWithdrawn = balanceAfter - balanceBefore;

            // Update our tracking
            if (actualWithdrawn > strategyInfo[strategy].totalDeposited) {
                strategyInfo[strategy].totalDeposited = 0;
            } else {
                strategyInfo[strategy].totalDeposited -= actualWithdrawn;
            }

            emit FundsWithdrawnFromStrategy(strategy, actualWithdrawn);
        } catch {
            actualWithdrawn = 0;
        }
    }

    /**
     * @notice Emergency withdraw all funds from a strategy.
     */
    function _emergencyWithdrawFromStrategy(address strategy) internal {
        // Try to redeem all our shares from the strategy
        uint256 shares = IERC20(strategy).balanceOf(address(this));
        if (shares > 0) {
            try ERC4626(strategy).redeem(shares, address(this), address(this)) {
                strategyInfo[strategy].totalDeposited = 0;
            } catch {
                // If normal redeem fails, try emergency withdraw if available
                (bool success, ) = strategy.call(abi.encodeWithSignature("emergencyWithdrawToVault()"));
                if (success) {
                    strategyInfo[strategy].totalDeposited = 0;
                }
            }
        }
    }

    // ============ Hooks for ERC4626 Functions ============

    /**
     * @notice Called after assets are deposited to automatically deploy to strategies.
     */
    function _afterDeposit(uint256 /*assets*/, uint256 /*shares*/) internal {
        _autoDeployFunds();
    }

    /**
     * @notice Called before withdrawal to ensure sufficient liquidity.
     */
    function _beforeWithdraw(uint256 assets, uint256 /*shares*/) internal {
        uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));

        if (vaultBalance < assets) {
            // Need to withdraw from strategies
            uint256 needed = assets - vaultBalance;
            _withdrawFromStrategies(needed);
        }
    }

    /**
     * @notice Auto-deploy funds to maintain target allocations.
     * @dev Separate rebalance and _autoDeployFunds to optimize gas
     */
    function _autoDeployFunds() internal {
        uint256 totalFunds = totalAssets();
        if (totalFunds <= minLiquidity) return; // Not enough to deploy

        uint256 deployableAmount = totalFunds - minLiquidity;

        for (uint256 i = 0; i < _strategies.length; i++) {
            address strategy = _strategies[i];
            if (!strategyInfo[strategy].isActive) continue;

            uint256 targetAmount = (deployableAmount * strategyInfo[strategy].targetAllocation) / 10000;
            uint256 currentAmount = strategyInfo[strategy].totalDeposited;

            if (targetAmount > currentAmount) {
                // Need to deposit more
                uint256 toDeposit = targetAmount - currentAmount;
                uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));

                if (toDeposit > vaultBalance) {
                    toDeposit = vaultBalance;
                }

                if (toDeposit > 0) {
                    _depositToStrategy(strategy, toDeposit);
                }
            } else if (targetAmount < currentAmount) {
                // Need to withdraw excess
                uint256 toWithdraw = currentAmount - targetAmount;
                _withdrawFromStrategy(strategy, toWithdraw);
            }
        }
    }

    /**
     * @notice Withdraw specified amount from strategies (starting with most over-allocated).
     */
    function _withdrawFromStrategies(uint256 needed) internal {
        uint256 withdrawn = 0;

        // Sort strategies by over-allocation and withdraw from most over-allocated first
        for (uint256 i = 0; i < _strategies.length && withdrawn < needed; i++) {
            address strategy = _strategies[i];
            if (!strategyInfo[strategy].isActive) continue;

            uint256 toWithdraw = needed - withdrawn;
            uint256 maxWithdrawable = strategyInfo[strategy].totalDeposited;

            if (toWithdraw > maxWithdrawable) {
                toWithdraw = maxWithdrawable;
            }

            if (toWithdraw > 0) {
                uint256 actualWithdrawn = _withdrawFromStrategy(strategy, toWithdraw);
                withdrawn += actualWithdrawn;
            }
        }

        require(withdrawn >= needed, "insufficient strategy liquidity");
    }

    // ============ Pausing Effect on New Deposits ============
    // Block deposits and mints while paused, but keep withdraw/redeem open.

    function deposit(
        uint256 assets,
        address receiver
    ) public override whenNotPaused nonReentrant returns (uint256 shares) {
        shares = super.deposit(assets, receiver);
        _afterDeposit(assets, shares);
    }

    function mint(
        uint256 shares,
        address receiver
    ) public override whenNotPaused nonReentrant returns (uint256 assets) {
        assets = super.mint(shares, receiver);
        _afterDeposit(assets, shares);
    }

    // Withdraw/redeem stay available even when paused (so users can exit).
    function withdraw(
        uint256 assets,
        address receiver,
        address owner_
    ) public override nonReentrant returns (uint256 shares) {
        _beforeWithdraw(assets, 0);
        return super.withdraw(assets, receiver, owner_);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner_
    ) public override nonReentrant returns (uint256 assets) {
        assets = super.previewRedeem(shares);
        _beforeWithdraw(assets, shares);
        return super.redeem(shares, receiver, owner_);
    }

    // Also inform front-ends about pause via maxDeposit/maxMint = 0 when paused.
    function maxDeposit(address) public view override returns (uint256) {
        return paused() ? 0 : type(uint256).max;
    }

    function maxMint(address) public view override returns (uint256) {
        return paused() ? 0 : type(uint256).max;
    }

    // Hard-block ETH sent directly
    receive() external payable {
        revert("Vault doesn't allow direct payments.");
    }
}
