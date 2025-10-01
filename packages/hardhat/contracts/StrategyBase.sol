pragma solidity >=0.8.0 <0.9.0;

import { IERC20, ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StrategyBase (ERC-4626)
 * @notice Tokenized base strategy intended to be managed by a Vault.
 *         - Only the configured `vault` can deposit/mint/withdraw/redeem.
 *         - Child strategies override virtual hooks to invest funds and realize PnL.
 *         - Emergency shutdown blocks new deposits/mints (withdraw/redemption remain).
 *
 * @dev Default implementation keeps funds idle in this contract (safe no-op).
 *      Override `_deployFunds`, `_freeFunds`, `_totalDeployed`, and `_harvest` in children.
 */
contract StrategyBase is ERC4626, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---- Access roles ----
    address public immutable vault;

    modifier onlyVault() {
        require(msg.sender == vault, "BaseStrategy: caller not vault");
        _;
    }

    // ---- Events ----
    event Harvest(int256 pnl, uint256 totalAssetsAfter);
    event EmergencyShutdownUpdated(bool paused);
    event EmergencyWithdrawn(uint256 assets);

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address vault_,
        address owner_
    ) ERC20(name_, symbol_) ERC4626(asset_) Ownable(owner_) {
        require(vault_ != address(0), "BaseStrategy: vault zero");
        vault = vault_;
        // By default, asset has to be approved if the strategy pulls from vault (not used in MVP).
        // Your vault can also approve this strategy once to use ERC4626 deposit/mint flows.
    }

    // -------------------------
    // Emergency shutdown toggle
    // -------------------------
    /**
     * @notice Toggle emergency mode. When enabled, deposits/mints are paused.
     *         Withdraws/redemptions are still allowed so the vault can exit.
     */
    function setEmergencyShutdown(bool shutdown) external onlyOwner {
        if (shutdown) _pause();
        else _unpause();
        emit EmergencyShutdownUpdated(shutdown);
    }

    // --------------------------------
    // ERC-4626 access control overrides
    // --------------------------------
    function deposit(
        uint256 assets,
        address receiver
    ) public override whenNotPaused onlyVault nonReentrant returns (uint256 shares) {
        // Vault must have approved this strategy to pull `assets` first.
        return super.deposit(assets, receiver);
    }

    function mint(
        uint256 shares,
        address receiver
    ) public override whenNotPaused onlyVault nonReentrant returns (uint256 assets) {
        return super.mint(shares, receiver);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner_
    ) public override onlyVault nonReentrant returns (uint256 shares) {
        return super.withdraw(assets, receiver, owner_);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner_
    ) public override onlyVault nonReentrant returns (uint256 assets) {
        return super.redeem(shares, receiver, owner_);
    }

    // Block new deposits from frontends while paused
    function maxDeposit(address) public view override returns (uint256) {
        return paused() ? 0 : type(uint256).max;
    }

    function maxMint(address) public view override returns (uint256) {
        return paused() ? 0 : type(uint256).max;
    }

    // -----------------------
    // ERC-4626 accounting
    // -----------------------
    /**
     * @dev Total managed assets = idle assets here + deployed assets in the child strategy.
     *      Default child implementation returns 0 for _totalDeployed().
     */
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + _totalDeployed();
    }

    /**
     * @dev Hook called after shares are minted and assets were transferred in.
     *      Deploy newly received assets into the underlying venue.
     */
    function afterDeposit(uint256 assets, uint256 /*shares*/) internal virtual {
        if (assets > 0) _deployFunds(assets);
    }

    /**
     * @dev Hook called before shares are burned and assets are transferred out.
     *      Ensure `assets` liquidity is freed from the venue.
     */
    function beforeWithdraw(uint256 assets, uint256 /*shares*/) internal virtual {
        if (assets > 0) {
            uint256 freed = _freeFunds(assets);
            // If a venue cannot free exact amount, ensure at least `assets` is liquid here.
            require(IERC20(asset()).balanceOf(address(this)) >= assets, "BaseStrategy: insufficient liquidity");
            // `freed` is informational in base class; child may use it internally.
            freed;
        }
    }

    // -----------------------
    // Harvest / Reporting
    // -----------------------
    /**
     * @notice Realize PnL from underlying venue and update accounting.
     * @dev Child should return net PnL in asset units:
     *      >0 = profit realized (e.g., claim rewards, sell to asset)
     *      <0 = realized loss (e.g., slippage, fees)
     */
    function harvest() external virtual onlyOwner nonReentrant returns (int256 pnl) {
        pnl = _harvest();
        emit Harvest(pnl, totalAssets());
    }

    // -----------------------
    // Emergency Exit
    // -----------------------
    /**
     * @notice Attempt to free all funds and transfer idle assets to the vault.
     * @dev Used during emergencies; the vault can then withdraw/redeem shares on top.
     */
    function emergencyWithdrawToVault() external onlyOwner nonReentrant {
        uint256 wantBefore = IERC20(asset()).balanceOf(address(this));
        // Try to free as much as possible (best-effort)
        _freeFunds(type(uint256).max);
        uint256 bal = IERC20(asset()).balanceOf(address(this));
        uint256 freed = bal - wantBefore;

        if (bal > 0) {
            IERC20(asset()).safeTransfer(vault, bal);
        }
        emit EmergencyWithdrawn(freed);
    }

    // -----------------------
    // Virtual hooks for child
    // -----------------------

    /**
     * @dev Deploy `assets` from this contract into the underlying venue.
     *      Default: no-op (assets remain idle here).
     */
    function _deployFunds(uint256 assets) internal virtual {
        // Default is no-op. Child should invest `assets` into venue.
        assets;
    }

    /**
     * @dev Free up to `assets` back to this contract from the venue.
     * @return freed Amount of assets made liquid.
     *
     * Default: funds are already idle, so nothing to do.
     */
    function _freeFunds(uint256 assets) internal virtual returns (uint256 freed) {
        // Default behavior: assets already idle in this contract.
        // Return min(assets, balance)
        uint256 bal = IERC20(asset()).balanceOf(address(this));
        return assets >= bal ? bal : assets;
    }

    /**
     * @dev Report how many assets are currently deployed in the venue (not the idle balance here).
     * Default: 0 (nothing deployed).
     */
    function _totalDeployed() internal view virtual returns (uint256) {
        return 0;
    }

    /**
     * @dev Realize PnL. Child should pull rewards, unwind/compound, swap to `asset`, etc.
     * Default: 0 (no PnL).
     */
    function _harvest() internal virtual returns (int256) {
        return int256(0);
    }

    // Disallow receiving ETH by accident
    receive() external payable {
        revert("BaseStrategy: no ETH");
    }
}
