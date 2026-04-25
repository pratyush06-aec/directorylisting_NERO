import { ethers } from "ethers";

// Default placeholder address
export const CONTRACT_ADDRESS = "0xadb2582Cd6866D647Bd65CAae001FfcdcCeB8fc5";
export const REQUIRED_ADDRESS = "0x64dc46C67dDd6842a9fBc6Daf50160b71AF412cf";

export const NERO_CHAIN = {
    chainId: "0x2B1", // 689 in hex
    chainName: "Nero Testnet",
    nativeCurrency: {
        name: "NERO",
        symbol: "NERO",
        decimals: 18,
    },
    rpcUrls: ["https://rpc-testnet.nerochain.io"],
    blockExplorerUrls: ["https://testnet-explorer.nerochain.io"],
};

const ABI = [
    "function createListing(string id, address owner, string name, string category, string description, string contact, string website, string location) public",
    "function updateListing(string id, string name, string description, string contact, string website) public",
    "function verifyListing(string id) public",
    "function deactivateListing(string id) public",
    "function rateListing(string id, uint32 rating) public",
    "function getListing(string id) public view returns (tuple(string id, address owner, string name, string category, string description, string contact, string website, string location, bool isVerified, bool isActive, uint32 totalRating, uint32 ratingCount, uint64 createdAt))",
    "function listAll() public view returns (string[])"
];

let _provider;

const getProvider = () => {
    if (typeof window.ethereum === "undefined") return null;
    if (!_provider) {
        _provider = new ethers.BrowserProvider(window.ethereum);
    }
    return _provider;
};

const getSignerAndContract = async (forceConnect = false) => {
    const provider = getProvider();
    if (!provider) throw new Error("MetaMask not found");

    if (forceConnect) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
    }

    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length === 0) {
        if (!forceConnect) return await getSignerAndContract(true);
        throw new Error("No accounts authorized");
    }

    // Always ensure we are on the right network before getting signer
    const network = await provider.getNetwork();
    if (network.chainId !== 689n) {
        await addAndSwitchNeroNetwork();
        // Refresh provider after network change
        _provider = new ethers.BrowserProvider(window.ethereum);
        return await getSignerAndContract(forceConnect);
    }

    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    return { signer, contract };
};

export const checkConnection = async () => {
    if (typeof window.ethereum === "undefined") return null;
    try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
            const { signer } = await getSignerAndContract();
            const addr = await signer.getAddress();
            return { publicKey: addr };
        }
    } catch (err) {
        console.error("Check connection failed:", err);
    }
    return null;
};

export const connectWallet = async () => {
    try {
        const { signer } = await getSignerAndContract(true);
        const addr = await signer.getAddress();
        return { publicKey: addr };
    } catch (err) {
        if (err.code === 4001) throw new Error("Connection rejected by user");
        throw new Error(err.message || "Failed to connect wallet");
    }
};

const addAndSwitchNeroNetwork = async () => {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: NERO_CHAIN.chainId }],
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [NERO_CHAIN],
                });
            } catch (addError) {
                throw new Error("Failed to add NERO network to MetaMask");
            }
        } else {
            throw switchError;
        }
    }
};

// Internal wrapper for write operations with retry logic for 4100 errors
const executeWrite = async (methodName, params) => {
    let retryCount = 0;
    while (retryCount < 2) {
        try {
            const { contract } = await getSignerAndContract(retryCount > 0);
            const tx = await contract[methodName](...params);
            const receipt = await tx.wait();
            return { status: "Success", transactionHash: receipt.hash };
        } catch (error) {
            // 4100 is "Not Authorized", often happens if session expired or account switched
            if (error.code === 4100 || (error.info && error.info.error && error.info.error.code === 4100)) {
                console.warn("Detected 4100 error, attempting re-authorization...");
                retryCount++;
                if (retryCount >= 2) throw error;
                continue;
            }
            throw error;
        }
    }
};



// --- Contract Interactions ---

export const createListing = async (payload) => {
    return await executeWrite("createListing", [
        payload.id,
        payload.owner,
        payload.name,
        payload.category || "general",
        payload.description,
        payload.contact,
        payload.website,
        payload.location
    ]);
};

export const updateListing = async (payload) => {
    return await executeWrite("updateListing", [
        payload.id,
        payload.name,
        payload.description,
        payload.contact,
        payload.website
    ]);
};

export const verifyListing = async (payload) => {
    return await executeWrite("verifyListing", [payload.id]);
};

export const deactivateListing = async (payload) => {
    return await executeWrite("deactivateListing", [payload.id]);
};

export const rateListing = async (payload) => {
    return await executeWrite("rateListing", [payload.id, payload.rating]);
};

export const getListing = async (id) => {
    const { contract } = await getSignerAndContract();
    const data = await contract.getListing(id);
    if (data.createdAt === 0n) {
        throw new Error("Listing not found");
    }
    return serializeListing(data);
};

export const listAll = async () => {
    const { contract } = await getSignerAndContract();
    const data = await contract.listAll();
    return data.map(id => id.toString());
};

const serializeListing = (data) => {
    return {
        id: data.id,
        owner: data.owner,
        name: data.name,
        category: data.category,
        description: data.description,
        contact: data.contact,
        website: data.website,
        location: data.location,
        isVerified: data.isVerified,
        isActive: data.isActive,
        totalRating: Number(data.totalRating),
        ratingCount: Number(data.ratingCount),
        createdAt: Number(data.createdAt),
    };
};
