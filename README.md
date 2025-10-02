![Yield Vault Banner](https://github.com/user-attachments/assets/your-banner-id)

# 🏦 Yield Vault

**Secure, low-risk savings for your crypto**

Yield Vault is a crypto savings platform that solves the treasury management problem by providing a simple, bank-like savings account experience for digital assets. Born from the founders' own struggle to confidently allocate their treasury across DeFi protocols, Yield Vault allows users to deposit USDC, ETH, or BTC into risk-managed vaults that automatically diversify across multiple low-risk yield strategies.

## 🌟 Key Features

- **Multi-Asset Support**: Deposit USDC, ETH, or BTC into dedicated vaults
- **Automated Diversification**: Funds are automatically allocated across multiple low-risk yield strategies
- **Conservative Yield Strategies**:
  - Lending protocols (Aave, Compound)
  - Liquid staking (Lido, Rocket Pool)
  - DEX liquidity provision (Uniswap, Curve)
  - Other conservative DeFi approaches
- **ERC-4626 Standard**: Built on the robust vault standard for maximum compatibility
- **Transparent Risk Management**: Comprehensive protocol risk assessments
- **Instant Withdrawals**: Access your funds whenever needed
- **Bank-like UX**: User-friendly interface that abstracts DeFi complexity

## 🎯 Problem We Solve

Managing treasury across DeFi protocols is complex and risky. Yield Vault provides:

- **Simplified Access**: No need to research dozens of protocols
- **Risk Mitigation**: Professional diversification across vetted strategies
- **Operational Efficiency**: One interface for all your yield-generating assets
- **Peace of Mind**: Transparent operations with instant liquidity

## 🚀 Tech Stack

Built with modern web3 technologies:

- **Frontend**: NextJS, TypeScript, TailwindCSS
- **Smart Contracts**: Solidity, Hardhat, ERC-4626 Vaults
- **Web3 Integration**: Alchemy AccountKit, Wagmi, Viem
- **Blockchain**: Ethereum (Sepolia Testnet)

## 📖 How It Works

1. **Connect Wallet**: Use any wallet or create a smart account with AccountKit
2. **Choose Asset**: Select from USDC, ETH, or BTC vaults
3. **Deposit Funds**: Your assets are automatically deployed to risk-managed strategies
4. **Earn Yield**: Watch your savings grow through diversified DeFi protocols
5. **Withdraw Anytime**: Access your funds instantly whenever needed

## 🛠 Development Setup

### Requirements

Before you begin, you need to install the following tools:

- [Node (>= v22.0)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

### Quick Start

To get started with Yield Vault, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/FELT-Labs/token2049-origins-hackathon.git
cd token2049-origins-hackathon
```

2. Install dependencies:

```bash
yarn install
```

3. Deploy the smart contracts:

```bash
yarn deploy
```

This deploys the vault contracts to Sepolia testnet (configured in `packages/hardhat/hardhat.config.ts`)

4. Start the development server:

```bash
yarn start
```

Visit your app at: `http://localhost:3000`

### Smart Contract Architecture

- **USDCVault.sol**: Main vault contract implementing ERC-4626 standard
- **StrategyBase.sol**: Base class for yield strategy implementations
- **MockYieldStrategy.sol**: Demo strategy for testing yield generation
- **Strategy Management**: Automated fund allocation and rebalancing

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
yarn test

# Run specific test files
yarn test test/Vault.ts
yarn test test/VaultStrategyIntegration.ts
```

## 🌐 Live Demo

Try the live application: [Yield Vault Demo](https://token2049-origins-hackathon-nextjs.vercel.app/)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to:

- Report bugs
- Suggest features
- Submit pull requests
- Follow our coding standards

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Scaffold-Alchemy](https://docs.alchemy.com/docs/scaffold-alchemy)
- Powered by [Alchemy](https://www.alchemy.com/)
- ERC-4626 Vault Standard
- OpenZeppelin Contracts

---

**Disclaimer**: This is a proof-of-concept built for Token2049 Origins Hackathon. Not audited for production use.
