import React, { useState, useRef, useEffect, useCallback } from "react";
import { checkConnection, connectWallet, createListing, updateListing, verifyListing, deactivateListing, rateListing, getListing, listAll, REQUIRED_ADDRESS } from "../lib/nero.js";
import "./App.css";

const toOutput = (value) => {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
};

const initialForm = () => ({
    id: "biz_" + Math.random().toString(36).substring(2, 7),
    owner: "0x64dc46C67dDd6842a9fBc6Daf50160b71AF412cf",
    name: "Nero Nexus",
    category: "technology",
    description: "Next Generation Directory",
    contact: "nexus@nero.io",
    website: "https://nexus.nero.io",
    location: "Decentralized City",
    verifier: "",
    rater: "",
    rating: "5",
});

const TABS = ["Create Listing", "Manage", "Browse"];

export default function App() {
    const [view, setView] = useState("landing");
    const [form, setForm] = useState(initialForm);
    const [output, setOutput] = useState("System Ready.");
    const [walletState, setWalletState] = useState("Wallet: not connected");
    const [isBusy, setIsBusy] = useState(false);
    const [loadingAction, setLoadingAction] = useState(null);
    const [status, setStatus] = useState("idle");
    const [activeTab, setActiveTab] = useState(0);
    const [confirmAction, setConfirmAction] = useState(null);
    const confirmTimer = useRef(null);
    const [connectedAddress, setConnectedAddress] = useState("");
    const [notifications, setNotifications] = useState([]);
    const appRef = useRef(null);

    useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

    // Global mouse hook for heat effect
    useEffect(() => {
        const handleGlobalMouseMove = (e) => {
            if (appRef.current) {
                const rect = appRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                appRef.current.style.setProperty('--mouse-x', `${x}px`);
                appRef.current.style.setProperty('--mouse-y', `${y}px`);
            }
        };
        window.addEventListener("mousemove", handleGlobalMouseMove);
        return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
    }, []);

    const setField = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Auto-connect and listeners
    useEffect(() => {
        const init = async () => {
            const user = await checkConnection();
            if (user) {
                const isMatch = user.publicKey.toLowerCase().trim() === REQUIRED_ADDRESS.toLowerCase().trim();
                if (isMatch) {
                    setConnectedAddress(user.publicKey);
                    setWalletState(`Wallet Connected: ${user.publicKey}`);
                    setForm(prev => ({
                        ...prev,
                        owner: user.publicKey,
                        verifier: prev.verifier || user.publicKey,
                        rater: prev.rater || user.publicKey
                    }));
                } else {
                    console.error("Init Mismatch:", { detected: user.publicKey, required: REQUIRED_ADDRESS });
                    setConnectedAddress("WRONG_ACCOUNT");
                    setWalletState(`Error: Please switch to ${REQUIRED_ADDRESS}`);
                }
            }
        };
        init();

        if (window.ethereum) {
            const handleAccounts = (accounts) => {
                const target = accounts.find(a => a.toLowerCase().trim() === REQUIRED_ADDRESS.toLowerCase().trim());
                if (target) {
                    setConnectedAddress(target);
                    setWalletState(`Wallet Connected: ${target}`);
                    setForm(prev => ({ ...prev, owner: target }));
                } else if (accounts.length > 0) {
                    console.error("Mismatch:", { detected: accounts[0], required: REQUIRED_ADDRESS });
                    setConnectedAddress("WRONG_ACCOUNT");
                    setWalletState(`Error: Please switch to ${REQUIRED_ADDRESS}`);
                } else {
                    setConnectedAddress("");
                    setWalletState("Wallet: not connected");
                }
            };
            const handleChain = () => window.location.reload();

            window.ethereum.on("accountsChanged", handleAccounts);
            window.ethereum.on("chainChanged", handleChain);

            return () => {
                window.ethereum.removeListener("accountsChanged", handleAccounts);
                window.ethereum.removeListener("chainChanged", handleChain);
            };
        }
    }, []);

    const addNotification = (msg, type = "success") => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, msg, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const runAction = async (action) => {
        setIsBusy(true);
        setStatus("loading");
        try {
            const result = await action();
            setOutput(toOutput(result ?? "No data retrieved"));
            setStatus("success");
            if (result?.status === "Success" || typeof result === "object") {
                addNotification(result?.status || "Transaction Executed Successfully!");
            }
        } catch (error) {
            const errMsg = error?.message || String(error);
            setOutput(errMsg);
            setStatus("error");
            addNotification(errMsg, "error");
        } finally {
            setIsBusy(false);
        }
    };

    const withLoading = (key, fn) => async () => {
        setLoadingAction(key);
        await fn();
        setLoadingAction(null);
    };

    const handleDestructive = (key, fn) => () => {
        if (confirmAction === key) {
            clearTimeout(confirmTimer.current);
            setConfirmAction(null);
            fn();
        } else {
            setConfirmAction(key);
            confirmTimer.current = setTimeout(() => setConfirmAction(null), 3000);
        }
    };

    const onConnect = withLoading("connect", () => runAction(async () => {
        const user = await connectWallet();
        if (user) {
            const isMatch = user.publicKey.toLowerCase().trim() === REQUIRED_ADDRESS.toLowerCase().trim();
            if (isMatch) {
                setConnectedAddress(user.publicKey);
                setForm((prev) => ({
                    ...prev,
                    owner: user.publicKey,
                    verifier: prev.verifier || user.publicKey,
                    rater: prev.rater || user.publicKey,
                }));
                const next = `Wallet Connected: ${user.publicKey}`;
                setWalletState(next);
                return next;
            } else {
                console.error("Connect Mismatch:", { detected: user.publicKey, required: REQUIRED_ADDRESS });
                setConnectedAddress("WRONG_ACCOUNT");
                setWalletState(`Error: Please switch to ${REQUIRED_ADDRESS}`);
                throw new Error(`Unauthorized Account: Detected ${user.publicKey}, but required ${REQUIRED_ADDRESS}`);
            }
        }
        return "Wallet: not connected";
    }));

    const onCreate = withLoading("create", () => runAction(async () => createListing({
        id: form.id.trim(),
        owner: form.owner.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        contact: form.contact.trim(),
        website: form.website.trim(),
        location: form.location.trim(),
    })));

    const onUpdate = withLoading("update", () => runAction(async () => updateListing({
        id: form.id.trim(),
        owner: form.owner.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        contact: form.contact.trim(),
        website: form.website.trim(),
    })));

    const onVerify = withLoading("verify", () => runAction(async () => verifyListing({
        id: form.id.trim(),
        verifier: form.verifier.trim() || form.owner.trim(),
    })));

    const onDeactivate = handleDestructive("deactivate", withLoading("deactivate", () => runAction(async () => deactivateListing({
        id: form.id.trim(),
        owner: form.owner.trim(),
    }))));

    const onRate = withLoading("rate", () => runAction(async () => rateListing({
        id: form.id.trim(),
        rater: form.rater.trim() || form.owner.trim(),
        rating: form.rating.trim(),
    })));

    const onGet = withLoading("get", () => runAction(async () => getListing(form.id.trim())));

    const onList = withLoading("list", () => runAction(async () => listAll()));

    const ratingNum = parseInt(form.rating, 10) || 0;
    const isConnected = connectedAddress.length > 0;
    const truncAddr = connectedAddress ? connectedAddress.slice(0, 6) + "..." + connectedAddress.slice(-4) : "";

    const btnClass = (key, extra = "") => {
        let cls = extra;
        if (loadingAction === key) cls += " loading";
        return cls.trim();
    };

    const outputIsEmpty = output === "System Ready.";

    // Render Landing
    if (view === "landing") {
        return (
            <div className="landing-page" ref={appRef}>
                <div className="ambient-glow"></div>
                <div className="landing-card card-3d" onMouseMove={(e) => {
                     const rect = e.currentTarget.getBoundingClientRect();
                     const x = e.clientX - rect.left - rect.width/2;
                     const y = e.clientY - rect.top - rect.height/2;
                     e.currentTarget.style.transform = `perspective(1000px) rotateX(${-y/10}deg) rotateY(${x/10}deg) scale3d(1.02, 1.02, 1.02)`;
                }} onMouseLeave={(e) => {
                     e.currentTarget.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                }}>
                    <div className="card-border-glow"></div>
                    <div className="card-content">
                        <div className="badge-pill pulse">NERO CHAIN V1</div>
                        <h1 className="glitch-text" data-text="Business Directory">Business Directory</h1>
                        <p className="hero-subtext">A next-generation decentralized hub. Create, verify, and rate businesses across the NERO network with frictionless Web3 architecture.</p>
                        <div className="cta-group">
                            <button className="btn-primary glow-effect" onClick={() => setView("app")}>
                                Launch Application
                            </button>
                            <a href="https://nerochain.io" target="_blank" rel="noreferrer" className="btn-ghost">Read Docs</a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render Main App
    return (
        <div className="app-container" ref={appRef}>
            <div className="ambient-glow"></div>
            <nav className="top-nav glass-panel heat-card">
                <div className="card-border-glow"></div>
                <div className="brand" onClick={() => setView("landing")}>
                    <div className="logo-orb"></div>
                    <span style={{ position: 'relative', zIndex: 2 }}>NERO Directory</span>
                </div>
                <div className="wallet-status" style={{ position: 'relative', zIndex: 2 }}>
                    {isConnected ? (
                        <div className={`wallet-pill glass-panel ${connectedAddress === "WRONG_ACCOUNT" ? "status-error" : ""}`}>
                        <span className={`wallet-status-dot ${connectedAddress === "WRONG_ACCOUNT" ? "bg-error" : ""}`}></span>
                        <span className="wallet-address">
                            {connectedAddress === "WRONG_ACCOUNT" 
                                ? "WRONG ACCOUNT" 
                                : connectedAddress 
                                    ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}` 
                                    : "Not Connected"}
                        </span>
                    </div>
                    ) : (
                        <div className="wallet-pill offline">
                            <span className="dot disconnected"></span>
                            <span className="addr">Offline</span>
                        </div>
                    )}
                    <button className={btnClass("connect", "btn-outline glow-effect")} onClick={onConnect} disabled={isBusy}>
                        {isConnected ? "Reconnect" : "Connect Wallet"}
                    </button>
                </div>
            </nav>

            <main className="main-content grid-layout">
                {/* Left Column: Actions */}
                <div className="left-panel">
                    <div className="tabs-container glass-panel heat-card">
                        <div className="card-border-glow"></div>
                        {TABS.map((tab, i) => (
                            <button
                                key={tab}
                                type="button"
                                className={`tab-btn ${activeTab === i ? "active" : ""}`}
                                onClick={() => setActiveTab(i)}
                                style={{ position: 'relative', zIndex: 2 }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="control-panel glass-panel heat-card">
                       <div className="card-border-glow"></div>
                        {activeTab === 0 && (
                            <div className="form-wrapper slide-in">
                                <h2 className="panel-title">Deploy Listing</h2>
                                <div className="input-grid">
                                    <div className="input-group">
                                        <label>Listing ID</label>
                                        <input name="id" value={form.id} onChange={setField} className="neon-input" />
                                    </div>
                                    <div className="input-group">
                                        <label>Owner Address</label>
                                        <input name="owner" value={form.owner} onChange={setField} placeholder="0x..." className="neon-input" />
                                    </div>
                                    <div className="input-group">
                                        <label>Business Name</label>
                                        <input name="name" value={form.name} onChange={setField} className="neon-input" />
                                    </div>
                                    <div className="input-group">
                                        <label>Category</label>
                                        <input name="category" value={form.category} onChange={setField} className="neon-input" />
                                    </div>
                                    <div className="input-group full">
                                        <label>Description</label>
                                        <textarea name="description" rows="2" value={form.description} onChange={setField} className="neon-input" />
                                    </div>
                                    <div className="input-group">
                                        <label>Contact</label>
                                        <input name="contact" value={form.contact} onChange={setField} className="neon-input" />
                                    </div>
                                    <div className="input-group full">
                                        <label>Location Map</label>
                                        <input name="location" value={form.location} onChange={setField} className="neon-input" />
                                    </div>
                                    <div className="input-group full">
                                        <label>Website Link</label>
                                        <input name="website" value={form.website} onChange={setField} className="neon-input" />
                                    </div>
                                </div>
                                <div className="action-row">
                                    <button className={btnClass("create", "btn-primary full-width glow-effect")} onClick={onCreate} disabled={isBusy}>Initialize Listing</button>
                                    <button className={btnClass("update", "btn-outline full-width")} onClick={onUpdate} disabled={isBusy}>Update Record</button>
                                </div>
                            </div>
                        )}

                        {activeTab === 1 && (
                            <div className="form-wrapper slide-in">
                                <h2 className="panel-title">Manage Operations</h2>
                                <div className="input-grid">
                                    <div className="input-group full">
                                        <label>Listing ID</label>
                                        <input name="id" value={form.id} onChange={setField} className="neon-input" />
                                    </div>
                                    <div className="input-group full">
                                        <label>Verifier Address</label>
                                        <input name="verifier" value={form.verifier} onChange={setField} placeholder="0x..." className="neon-input" />
                                        <button className={btnClass("verify", "btn-outline mt-sm full-width")} onClick={onVerify} disabled={isBusy}>Run Verification</button>
                                    </div>
                                    <div className="separator"></div>
                                    <div className="input-group">
                                        <label>Rater Address</label>
                                        <input name="rater" value={form.rater} onChange={setField} placeholder="0x..." className="neon-input" />
                                    </div>
                                    <div className="input-group">
                                        <label>Score (1-5)</label>
                                        <div className="star-rating">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <span key={s} className={`star ${s <= ratingNum ? "active" : ""}`}
                                                    onClick={() => setForm((prev) => ({ ...prev, rating: String(s) }))}>
                                                    ✦
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="input-group full">
                                         <button className={btnClass("rate", "btn-outline full-width")} onClick={onRate} disabled={isBusy}>Submit Rating</button>
                                    </div>
                                    <div className="separator"></div>
                                    <div className="input-group full">
                                        <button className={btnClass("deactivate", "btn-danger full-width")} onClick={onDeactivate} disabled={isBusy && loadingAction !== "deactivate"}>
                                            {confirmAction === "deactivate" ? "Confirm Deletion" : "Deactivate Profile"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 2 && (
                            <div className="form-wrapper slide-in">
                                <h2 className="panel-title">Network Query</h2>
                                <div className="input-grid">
                                    <div className="input-group full">
                                        <label>Query Listing ID</label>
                                        <div className="search-bar">
                                            <input name="id" value={form.id} onChange={setField} className="neon-input" placeholder="Enter ID to index..." />
                                            <button className={btnClass("get", "btn-primary inline-btn glow-effect")} onClick={onGet} disabled={isBusy}>Fetch</button>
                                        </div>
                                    </div>
                                    <div className="input-group full mt-md">
                                        <button className={btnClass("list", "btn-outline full-width")} onClick={onList} disabled={isBusy}>Index All Public Records</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Console / Output */}
                <div className="right-panel">
                    <div className={`console-window glass-panel heat-card status-${status}`}>
                         <div className="card-border-glow"></div>
                         <div className="console-header">
                             <div className="mac-dots">
                                 <span></span><span></span><span></span>
                             </div>
                             <span className="console-title">NETWORK_TERMINAL // OUT</span>
                         </div>
                         <div className="console-body">
                             {isBusy && status === "loading" && (
                                 <div className="success-banner slide-in" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(0, 243, 255, 0.05)' }}>
                                     <span className="success-icon">⏳</span> PENDING NETWORK CONFIRMATION...
                                 </div>
                             )}
                             {status === "success" && output && output.includes("transactionHash") && (
                                 <div className="success-banner slide-in">
                                     <span className="success-icon">✦</span> TRANSACTION COMPLETED SUCCESSFULLY
                                 </div>
                             )}
                             {status === "success" && output && output.includes("publicKey") && (
                                 <div className="success-banner slide-in" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(0, 243, 255, 0.05)' }}>
                                     <span className="success-icon" style={{ animation: 'none' }}>✓</span> WALLET AUTHORIZED
                                 </div>
                             )}

                             {outputIsEmpty ? (
                                 <div className="console-empty">
                                     <span className="blinking-cursor">_</span> Waiting for network events...
                                 </div>
                             ) : (
                                 <pre className="json-output">{output}</pre>
                             )}
                         </div>
                    </div>
                </div>
            </main>
            <div className="notifications-container">
                {notifications.map(n => (
                    <div key={n.id} className={`notification-toast ${n.type}`}>
                        <div className="toast-icon">
                            {n.type === "success" ? "✓" : "⚠"}
                        </div>
                        <div className="toast-content">
                            <div className="toast-title">{n.type === "success" ? "Network Confirmation" : "Protocol Alert"}</div>
                            <div className="toast-msg">{n.msg}</div>
                        </div>
                        <button className="toast-close" onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}>×</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
