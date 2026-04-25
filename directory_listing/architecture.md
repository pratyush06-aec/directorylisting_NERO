# Nero Business Directory: System Architecture

This document describes the high-level architecture flow of the Nero Business Directory application.

## 1. Frontend Layer (React + Vite)
- **App Shell (`App.jsx`)**: The core entry point that maintains the application state. It manages connection details, loading states, and the current interactive view (`landing` vs `app`).
- **UI Components & Glassmorphism (`App.css`)**: Pure CSS styling utilizing `--mouse-x` and `--mouse-y` runtime properties to handle 3D hardware-accelerated transforms and interactive heat-glow lighting without heavy external animation libraries.
- **State Management**: Uses React hooks (`useState`, `useEffect`, `useRef`) for local state. Actions that interact with the blockchain trigger a loading sequence and handle promise resolutions cleanly to update the UI "Terminal".

## 2. Integration Layer (`lib/nero.js`)
- Interfaces between the React frontend and the EVM Smart Contract on the NERO chain. 
- Handles MetaMask wallet authentication, connection, and automatic network switching (`checkConnection`, `connectWallet`, `addAndSwitchNeroNetwork`).
- Wraps all EVM smart contract network calls into asynchronous functions (`createListing`, `updateListing`, `verifyListing`, etc.) using `ethers.js`.

## 3. Blockchain Layer (NERO Testnet / EVM)
- **Smart Contract (`DirectoryListing.sol`)**: Handles the CRUD operations and immutable storage for the business directory on the NERO EVM network.
- **State Changes**: Methods for listing creation, updating fields, rating modifications, and deactivations.
- **Verification**: Built-in mechanisms embedded in the contract state to keep listing data trustworthy.

## Architecture Flow Diagram

```mermaid
graph TD
    User([User / Browser]) --> UI[Frontend React UI]
    UI -- Mouse Events --> CSS[CSS Variables & Transforms]
    UI -- Wallet Auth --> MetaMask[MetaMask Wallet Extension]
    UI -- User Actions --> Lib[lib/nero.js Integration Layer]
    Lib -- Transactions --> MetaMask
    MetaMask -- Signed TXs --> NeroNode[NERO RPC Node]
    NeroNode --> Contract[Solidity Smart Contract]
    Contract -- TX Results --> NeroNode
    NeroNode -- State/Data --> Lib
    Lib -- Data Updates --> UI
```
