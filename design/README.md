# Investment Vault App - HTML Mockups

This folder contains HTML mockups for the YieldVault investment application. These mockups demonstrate the UI/UX design for a vault-based approach where users can invest in asset-specific vaults that automatically optimize returns through various strategies.

## 📁 Files Overview

### `styles.css`
Shared CSS styles for all mockups including:
- Modern design system with clean typography
- Responsive grid layouts
- Interactive components (buttons, modals, forms)
- Color scheme optimized for financial applications
- Mobile-first responsive design

### `dashboard.html`
Main dashboard mockup featuring:
- **Token Balances**: Shows all user tokens with USDC marked as eligible for investing
- **Investment Overview**: Total invested, current value, and yields earned
- **Investment Vaults**: Asset-specific vaults (USDC, ETH, Bitcoin) with plain English explanations
- **Vault Cards**: Each showing current yield, total deposits, how it works, and your position
- **Recent Activity**: Transaction history and yield tracking
- **Interactive Elements**: Hover effects and simulated real-time updates

### `investment-modal.html`
Investment flow mockup including:
- **Vault Information**: Clear explanation of how USDC vault works with automatic optimization
- **Amount Input**: With validation and MAX button
- **Quick Amount Buttons**: $50, $100, $250, $500 presets
- **Investment Preview**: Shows new totals and estimated yields
- **Gas Fee Warning**: Transaction cost transparency
- **Loading States**: Processing feedback with spinner

### `withdrawal-modal.html`
Withdrawal flow mockup featuring:
- **Position Breakdown**: Principal vs earned yield visualization
- **Withdrawal Options**: 
  - Yield only (keep principal invested)
  - Partial withdrawal (custom amount)
  - Full withdrawal (close vault position)
- **Custom Amount Input**: For partial withdrawals with validation
- **Impact Preview**: Shows remaining position and future yield
- **Warning Messages**: For full withdrawal consequences

## 🎨 Design Features

### Color System
- **Primary**: Blue tones (#4f46e5) for main actions
- **Success**: Green (#10b981) for positive yields and gains
- **Warning**: Orange (#f59e0b) for medium risk and cautions  
- **Danger**: Red (#ef4444) for high risk and losses
- **Neutral**: Gray tones for secondary elements

### UX Principles
1. **Clarity First**: Clear display of balances and positions
2. **Safe Defaults**: Conservative options selected by default
3. **Immediate Feedback**: Loading states and validation messages
4. **Error Prevention**: Input validation and confirmation dialogs
5. **Progressive Disclosure**: Simple interface with advanced options available

### Interactive Elements
- **Hover Effects**: Cards lift and change shadow on hover
- **Real-time Updates**: Simulated yield updates every 30 seconds
- **Form Validation**: Real-time input validation with visual feedback
- **Keyboard Support**: Enter to confirm, Escape to close modals
- **Loading States**: Spinners and disabled states during transactions

## 🚀 How to View

1. Open any HTML file in a web browser
2. All files are self-contained with embedded CSS and JavaScript
3. Interactive elements work without a backend (simulated responses)
4. Responsive design works on desktop and mobile

## 📱 Responsive Design

- **Desktop**: Full feature set with side-by-side layouts
- **Tablet**: Adjusted grid layouts and font sizes
- **Mobile**: Stacked layouts with touch-friendly buttons
- **Breakpoint**: 768px for mobile optimization

## 🔄 Interactive Features

### Dashboard
- Click fund action buttons to see alert dialogs
- Hover over fund cards for lift effects
- Real-time yield simulation (updates every 30 seconds)

### Investment Modal
- Type amounts or use quick buttons
- MAX button fills available balance
- Real-time preview updates
- Form validation with visual feedback

### Withdrawal Modal
- Radio button selection changes UI
- Partial withdrawal shows custom input
- Full withdrawal shows warning message
- Preview updates based on selection

## 💡 Implementation Notes

These mockups serve as:
1. **Visual Reference**: For React component development
2. **UX Validation**: Test user flows before coding
3. **Stakeholder Review**: Share designs for feedback
4. **Development Guide**: Detailed interaction patterns

The designs follow modern web standards and can be directly translated into React components using the existing Scaffold-Alchemy framework with DaisyUI styling.

## 🏦 Vault-Based Approach

### Core Concept
Instead of showing complex investment strategies, the app uses a **vault-based approach**:

1. **Asset-Specific Vaults**: Users choose vaults based on the asset they want to optimize (USDC, ETH, Bitcoin)
2. **Automated Strategy Management**: The vault handles all strategy decisions automatically
3. **Plain English Explanations**: Each vault explains what it does in simple terms
4. **Token Eligibility**: Clear indication of which tokens can be invested (currently only USDC)

### User Journey
1. **View Token Balances** → See all tokens with investment eligibility status
2. **Choose Vault** → Select based on desired asset optimization (USDC vault available)
3. **Understand Strategy** → Read plain English explanation of how the vault works
4. **Invest** → Deposit eligible tokens into the chosen vault
5. **Monitor** → Track performance without worrying about underlying strategies
6. **Withdraw** → Flexible withdrawal options (yield only, partial, or full)

### Key Features
- **Only USDC eligible** for investment initially
- **Vault abstraction** hides complex DeFi strategies
- **Automatic optimization** handles rebalancing and strategy selection
- **Simple explanations** replace technical jargon
- **Future expansion** ready for ETH, Bitcoin, and other assets

## 🎯 Next Steps

1. Review vault-based mockups with stakeholders
2. Gather feedback on simplified user flows
3. Implement React components based on these designs
4. Create smart contracts for USDC vault functionality
5. Add real-time data fetching and automated strategy management

