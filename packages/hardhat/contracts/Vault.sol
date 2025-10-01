pragma solidity >=0.8.0 <0.9.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Vault (ERC-4626)
 * @notice Minimal Vault:
 *         - Users deposit base token (USDC) and receive shares
 *         - Owner can register/unregister strategy addresses (no allocation logic in MVP)
 *         - Emergency shutdown disables deposits/mints but keeps withdrawals/redemptions open
 *
 * @dev Assumes the underlying `asset` is a standard ERC20 (e.g., USDC with 6 decimals).
 *      Uses OZ ERC-4626 for accounting and share pricing.
 */
contract USDCVault is ERC4626, Ownable, Pausable, ReentrancyGuard {
    // --- Strategy registry (MVP: bookkeeping only) ---
    address[] private _strategies;
    mapping(address => bool) public isStrategy;

    // --- Events ---
    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
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
     * @notice Add a strategy address to the registry.
     * @dev In a full implementation, you’d validate ERC-4626/asset compatibility here.
     */
    function addStrategy(address strategy) external onlyOwner {
        require(strategy != address(0), "invalid strategy");
        require(!isStrategy[strategy], "already added");
        isStrategy[strategy] = true;
        _strategies.push(strategy);
        emit StrategyAdded(strategy);
    }

    /**
     * @notice Remove a strategy address from the registry.
     */
    function removeStrategy(address strategy) external onlyOwner {
        require(isStrategy[strategy], "not a strategy");
        isStrategy[strategy] = false;

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

        // Should not hit here because isStrategy[strategy] was true
        revert("remove failed");
    }

    /**
     * @notice Read-only: full list of strategy addresses.
     */
    function getStrategies() external view returns (address[] memory) {
        return _strategies;
    }

    // ============ Pausing Effect on New Deposits ============
    // Block deposits and mints while paused, but keep withdraw/redeem open.

    function deposit(
        uint256 assets,
        address receiver
    ) public override whenNotPaused nonReentrant returns (uint256 shares) {
        return super.deposit(assets, receiver);
    }

    function mint(
        uint256 shares,
        address receiver
    ) public override whenNotPaused nonReentrant returns (uint256 assets) {
        return super.mint(shares, receiver);
    }

    // Withdraw/redeem stay available even when paused (so users can exit).
    function withdraw(
        uint256 assets,
        address receiver,
        address owner_
    ) public override nonReentrant returns (uint256 shares) {
        return super.withdraw(assets, receiver, owner_);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner_
    ) public override nonReentrant returns (uint256 assets) {
        return super.redeem(shares, receiver, owner_);
    }

    // Also inform front-ends about pause via maxDeposit/maxMint = 0 when paused.
    function maxDeposit(address) public view override returns (uint256) {
        return paused() ? 0 : type(uint256).max;
    }

    function maxMint(address) public view override returns (uint256) {
        return paused() ? 0 : type(uint256).max;
    }

    // Optional: disallow share transfers while paused? We keep them allowed.
    // If you want to block transfers while paused, override _update to add whenNotPaused.

    // Hard-block ETH sent directly
    receive() external payable {
        revert("Vault doesn't allow direct payments.");
    }
}
