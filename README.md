# Decentralized Book Rental Platform

A blockchain-based decentralized application (dApp) for renting books using Ethereum smart contracts. This project allows users to list their books for rent, rent books from others, and manage their rentals in a completely decentralized manner.

## 📚 Team CryptoSphere

| Name               | Roll Number |
|--------------------|-------------|
| Ayush Kumar       | 230001012  |
| Hemsai           | 230001079    |
| Shubham Prajapati  | 230005047     |
| Raja Reddy          | 230001054     |
| Vikas       | 230002023    |
| Sudheendra       | 230001076    |

## 📋 Project Features

- **List Books**: Users can list their books with title, author, description, and cover image
- **Set Rental Terms**: Define price per minute and security deposit
- **Rent Books**: Browse the marketplace and rent available books
- **Return Books**: Return books and receive deposit back (minus rental fees)
- **IPFS Integration**: Book cover images stored on IPFS for decentralized file storage
- **Responsive UI**: Modern UI built with React and Bootstrap

## 🔧 Technology Stack

- **Smart Contracts**: Solidity (^0.8.19)
- **Blockchain Development**: Truffle, Hardhat and Ganache
- **Frontend**: React.js with Web3.js and Ethers.js
- **File Storage**: IPFS via Pinata
- **Styling**: Bootstrap and custom CSS
- **Testing**: Mocha and Chai

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- MetaMask browser extension
- Ganache for local blockchain development

### Option 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/Ayush-2224/CryptoSphere

cd CryptoSphere

npm install

#Keep it running in one terminal and connect the metamask account with gaunache
npx ganache-cli --port 8545 --networkId 1337

npm run migrate:reset:frontend

cd frontend
npm install
npm start
```

### Option 2: Download ZIP

1. Download the ZIP file from GitHub
2. Extract the ZIP file to your desired location
3. Open a terminal and navigate to the extracted directory
4. Follow these commands:

```bash

npm install

#Keep it running in one terminal and connect the metamask account with gaunache
npx ganache-cli --port 8545 --networkId 1337

npm run migrate:reset:frontend

cd frontend
npm install
npm start
```

### Running Tests

The project contains test suites for Hardhat. 

#### Tests

```bash

npx hardhat test test/BookRental.hardhat.test.js

npx hardhat test test/ReentrancyProtection.test.js

```

### Connecting to the Application

1. Open MetaMask and connect to the local Ganache network:
   - Network Name: Ganache
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 1337
   - Currency Symbol: ETH

2. Import at least one account from Ganache to MetaMask using the private key

3. Open your browser and navigate to `http://localhost:3000`

4. Connect your MetaMask wallet when prompted

## 📊 Project Structure

```
├── contracts/               # Smart contract source files
├── migrations/              # Deployment scripts for contracts
├── test/                    # Smart contract test files
├── frontend/                # React frontend application
│   ├── public/              # Static assets
│   └── src/                 # Source code
│       ├── components/      # React components
│       ├── hooks/           # Custom React hooks
│       ├── services/        # API services
│       ├── styles/          # CSS styles
│       └── utils/           # Utility functions
├── scripts/                 # Helper scripts
├── truffle-config.js        # Truffle configuration
└── hardhat.config.js        # Hardhat configuration
```

## 📝 Smart Contract

The main `BookRental.sol` contract handles all book rental operations including:

- Listing books for rent
- Renting books with deposit
- Returning books (with automatic fee calculation)


## 🔒 Security Features

- Re-entrancy protection using OpenZeppelin's ReentrancyGuard
- Proper access control using Ownable pattern
- Secure state management with check-effects-interactions pattern
- Input validation for all parameters

## 8. References

1. Ethereum Smart Contract Best Practices: https://consensys.github.io/smart-contract-best-practices/
2. OpenZeppelin Security Contracts: https://docs.openzeppelin.com/contracts/
3. IPFS Documentation: https://docs.ipfs.io/
4. Web3.js Documentation: https://web3js.readthedocs.io/
5. Ethers.js Documentation: https://docs.ethers.io/ 
