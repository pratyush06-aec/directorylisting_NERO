const { ethers } = require("ethers");
const privateKey = "9e3f2e1600b407fda49e1319403290e618662811f11829b968ddba6e8499453b";
const wallet = new ethers.Wallet(privateKey);
console.log("Address:", wallet.address);
