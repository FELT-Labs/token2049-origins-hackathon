# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Scaffold-Alchemy**, a fork of Scaffold-ETH 2 for building dApps with Account Abstraction (AA). The project implements an **investment vault system** where users can deposit USDC into ERC-4626 vaults that automatically optimize returns through various DeFi strategies.

### Core Architecture

The project is a **monorepo with two main workspaces**:

1. **`packages/hardhat`** - Smart contracts (Solidity) and deployment scripts
2. **`packages/nextjs`** - Frontend application (Next.js 14 with App Router, React 18, TypeScript)

The architecture follows a **vault-based approach**:
- **Vault (ERC-4626)**: Users deposit base tokens (USDC) and receive shares. The vault manages strategy registration.
- **StrategyBase (ERC-4626)**: Abstract base for investment strategies. Only the vault can interact with strategies.
- **Strategies**: Concrete implementations that deploy funds to DeFi protocols (e.g., Aave, Compound).

### Key Technologies

- **Smart Contracts**: Solidity 0.8.20, OpenZeppelin contracts, ERC-4626 standard
- **Account Abstraction**: Alchemy's AccountKit for smart contract wallets with gas sponsorship
- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS, DaisyUI, Wagmi 2.x
- **Development**: Hardhat, TypeScript, Yarn 3 workspaces
- **Authentication**: Google OAuth via AccountKit (social login)

## Development Commands

### Initial Setup
```bash
yarn install                    # Install all dependencies
```

### Smart Contract Development
```bash
yarn compile                    # Compile all contracts
yarn hardhat:test               # Run contract tests
yarn deploy                     # Deploy contracts to configured testnet (see chainDeploy.ts)
yarn deploy:mainnet             # Deploy to mainnet
yarn hardhat:verify             # Verify contracts on block explorer
```

### Frontend Development
```bash
yarn start                      # Start Next.js dev server on port 56900
yarn next:build                 # Build Next.js for production
yarn next:serve                 # Serve production build
```

### Code Quality
```bash
yarn lint                       # Lint all packages (Next.js + Hardhat)
yarn format                     # Format code with Prettier
yarn hardhat:check-types        # TypeScript type checking (Hardhat)
yarn next:check-types           # TypeScript type checking (Next.js)
```

### Testing
```bash
yarn test                       # Run Hardhat tests with gas reporting
yarn hardhat:test               # Same as above (explicit)
```

### Local Blockchain
```bash
yarn chain                      # Start local hardhat node (via common/script/chain.js)
yarn fork                       # Fork mainnet for testing
```

## Configuration & Environment

### Chain Configuration
- **Primary config**: `packages/hardhat/config/chainConfig.json` defines testnet/mainnet chains
- **Hardhat config**: `packages/hardhat/hardhat.config.ts` uses chain config + Alchemy RPC URLs
- **Next.js config**: `packages/nextjs/scaffold.config.ts` selects chain based on NODE_ENV
- **Loading pattern**: `packages/hardhat/utils/loadCommon.ts` handles env vars with fallbacks to `config/defaultKeys.json`

### Environment Variables
Both packages have `.env.example` files. Key variables:
- `ALCHEMY_API_KEY` - RPC provider
- `ALCHEMY_GAS_POLICY_ID` - Gas sponsorship policy
- `PRIVATE_KEY` - Deployer private key
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - WalletConnect integration

Environment loading: Local `.env` → Root `.env` → `defaultKeys.json` fallback

### Network Defaults
Default testnet is configured in `chainConfig.json`. All network names come from `packages/hardhat/utils/chainUtils.ts` which maps to Alchemy network naming.

## Smart Contract Architecture

### Key Contracts

1. **`Vault.sol` (USDCVault)** - `packages/hardhat/contracts/Vault.sol`
   - ERC-4626 compliant vault for USDC deposits
   - Strategy registry (add/remove strategies)
   - Emergency shutdown (pauses deposits, keeps withdrawals open)
   - Owner-controlled (Ownable)

2. **`StrategyBase.sol`** - `packages/hardhat/contracts/StrategyBase.sol`
   - Abstract ERC-4626 strategy base class
   - Vault-only access control (onlyVault modifier)
   - Virtual hooks: `_deployFunds()`, `_freeFunds()`, `_totalDeployed()`, `_harvest()`
   - Emergency withdrawal to vault
   - Default: funds remain idle (child strategies override hooks)

3. **`Counter.sol`** - `packages/hardhat/contracts/Counter.sol`
   - Simple example contract (increment counter)

### Deployment Flow

Deployments use **Alchemy Account Abstraction (AA)** via `packages/hardhat/utils/deployWithAA.ts`:
- Creates smart contract wallet as deployer
- Uses Alchemy gas manager (no need for testnet ETH)
- Deployment scripts in `packages/hardhat/deploy/`:
  - `00_deploy_counter.ts` - Deploys Counter
  - `01_deploy_vault_and_strategy.ts` - Deploys USDCVault + mock strategies

After deployment, `generateTsAbis` task runs automatically (see hardhat.config.ts) to generate TypeScript ABIs for frontend.

### Testing
Tests in `packages/hardhat/test/`. Run with `yarn test` (includes gas reporting via hardhat-gas-reporter).

## Frontend Architecture

### App Structure (Next.js 14 App Router)

```
packages/nextjs/app/
├── layout.tsx                 # Root layout with providers
├── page.tsx                   # Home page (dashboard)
└── debug/                     # Contract debugging UI
    └── page.tsx
```

### Key Components

- **`components/TokenBalances.tsx`** - Display user token balances with investment eligibility
- **`components/TokenVaults.tsx`** - Display available vaults with APY, TVL, user positions
- **`components/InvestmentModal.tsx`** - Investment flow (deposit into vault)
- **`components/counter/CounterUI.tsx`** - Example contract interaction
- **`components/scaffold-alchemy/`** - Reusable scaffold components (ConnectButton, BlockieAvatar, inputs, etc.)

### Custom Hooks

- **`hooks/useTokenData.ts`** - Fetch token balances, prices, vault data
- **`hooks/useAccountType.ts`** - Detect AA vs EOA wallets
- **`hooks/scaffold-alchemy/`** - Scaffold utilities (contract reads/writes, balances, network, etc.)

### Account Abstraction Setup

**Configuration**: `packages/nextjs/account.config.ts`
- Uses Alchemy's AccountKit (createConfig from @account-kit/react)
- Social login: Google OAuth (popup mode)
- External wallets: WalletConnect
- Gas policy ID injected by backend at runtime (policyId: "<inserted-by-backend>")
- Custom RPC route: `/api/rpc/chain/[id]/[[...path]]/route.ts`

**Providers**: `components/ScaffoldEthAppWithProviders.tsx`
- AlchemyAccountProvider wraps app
- QueryClient for TanStack Query
- Theme provider for dark mode

### Styling
- TailwindCSS + DaisyUI components
- Theme config: `packages/nextjs/tailwind.config.js`
- Custom styles: `packages/nextjs/styles/`

## Vault-Based Investment Flow

The UI follows a **simplified vault-based approach** (see `design/README.md` for HTML mockups):

1. **User views token balances** → Only USDC marked as eligible for investment
2. **User selects USDC vault** → Plain English explanation of strategy
3. **User deposits USDC** → Receives vault shares (ERC-4626)
4. **Vault manages strategies** → Automatic optimization (no user decisions)
5. **User monitors position** → Track yield, deposits, current value
6. **User withdraws** → Options: yield only, partial, or full withdrawal

**Key Design Principles**:
- Hide complex DeFi strategies behind simple vault abstraction
- Plain English explanations replace technical jargon
- Only show eligible tokens (currently USDC)
- Automatic strategy management (vault owner handles rebalancing)

## Code Generation & Types

### Auto-Generated Files

After contract deployment, `generateTsAbis` script generates:
- **`packages/nextjs/contracts/`** - TypeScript contract definitions with typed ABIs
- These files are git-tracked and used by hooks for type-safe contract interactions

### TypeScript Version
Both packages use TypeScript `<5.6.0` (pinned in package.json)

## Git Workflow & CI

- **Pre-commit hooks**: Husky + lint-staged (formats and lints staged files)
- **CI**: GitHub Actions runs lint on PR (`.github/workflows/lint.yaml`)
- **Commit format**: See recent commits for style (descriptive, lowercase)

## Important Patterns

### RPC & Gas Management
- Frontend uses custom RPC proxy: `/api/rpc/chain/[id]/` (inserts Alchemy API key server-side)
- Gas sponsorship via Alchemy gas manager (ALCHEMY_GAS_POLICY_ID)
- Policy ID injected at runtime in account.config.ts

### Multichain Support
- Chain config system supports multiple chains (testnet/mainnet pairs)
- `utils/chainUtils.ts` defines available chains
- Frontend auto-selects chain based on NODE_ENV or NEXT_PUBLIC_SIMULATE_PROD

### Deployment with AA
All contract deployments use Account Abstraction via `deployWithAA.ts`:
- No need for deployer private key with testnet ETH
- Gas is sponsored by Alchemy gas manager
- Smart contract wallet is the deployer

### Contract Interactions
Frontend uses hooks from `hooks/scaffold-alchemy/`:
- `useScaffoldReadContract` - Read contract state
- `useScaffoldWriteContract` - Write transactions (supports AA)
- `useDeployedContractInfo` - Get deployed contract address + ABI
- Automatically works with both AA wallets and EOAs (detected via useAccountType)

## Development Tips

### Adding a New Strategy
1. Create contract extending `StrategyBase` in `packages/hardhat/contracts/`
2. Override virtual hooks: `_deployFunds`, `_freeFunds`, `_totalDeployed`, `_harvest`
3. Add deployment script in `packages/hardhat/deploy/`
4. Test strategy, then register with vault via `vault.addStrategy(strategyAddress)`

### Adding a New Vault
1. Create contract extending ERC4626 (or fork `Vault.sol`)
2. Deploy with appropriate base token (e.g., WETH for ETH vault)
3. Update frontend to display new vault in `TokenVaults.tsx`
4. Add vault ABI to contracts after deployment

### Changing Default Chain
1. Edit `packages/hardhat/config/chainConfig.json`
2. Update `testnetChainName` and `testnetChainId` (or mainnet equivalents)
3. Restart dev servers

### Running Single Test
```bash
cd packages/hardhat
npx hardhat test test/YourTest.ts
```

## Project Status

Active hackathon project (TOKEN2049 Origins Hackathon). Current implementation:
- ✅ ERC-4626 vault + strategy contracts
- ✅ Account Abstraction integration
- ✅ Basic frontend with token balances
- ✅ Investment modal UI
- 🚧 Live strategy implementations (currently using mocks)
- 🚧 Real-time yield tracking
- 🚧 Withdrawal flows

See `design/README.md` for UI mockups of planned features.
