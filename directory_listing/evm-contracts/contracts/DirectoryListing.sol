// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DirectoryListing {
    struct Listing {
        string id;
        address owner;
        string name;
        string category;
        string description;
        string contact;
        string website;
        string location;
        bool isVerified;
        bool isActive;
        uint32 totalRating;
        uint32 ratingCount;
        uint64 createdAt;
    }

    mapping(string => Listing) public listings;
    string[] public listingIds;

    event ListingCreated(string id, address owner, string name);
    event ListingUpdated(string id, string name);
    event ListingVerified(string id, address verifier);
    event ListingDeactivated(string id, address owner);
    event ListingRated(string id, address rater, uint32 rating);

    modifier onlyOwner(string memory id) {
        require(listings[id].owner == msg.sender, "NotOwner");
        _;
    }

    modifier listingExists(string memory id) {
        require(listings[id].createdAt != 0, "NotFound");
        _;
    }

    function createListing(
        string memory id,
        address owner,
        string memory name,
        string memory category,
        string memory description,
        string memory contact,
        string memory website,
        string memory location
    ) public {
        require(listings[id].createdAt == 0, "AlreadyExists");
        require(bytes(name).length > 0, "InvalidName");
        
        listings[id] = Listing({
            id: id,
            owner: owner,
            name: name,
            category: category,
            description: description,
            contact: contact,
            website: website,
            location: location,
            isVerified: false,
            isActive: true,
            totalRating: 0,
            ratingCount: 0,
            createdAt: uint64(block.timestamp)
        });

        listingIds.push(id);
        
        emit ListingCreated(id, owner, name);
    }

    function updateListing(
        string memory id,
        string memory name,
        string memory description,
        string memory contact,
        string memory website
    ) public listingExists(id) onlyOwner(id) {
        require(bytes(name).length > 0, "InvalidName");

        Listing storage listing = listings[id];
        listing.name = name;
        listing.description = description;
        listing.contact = contact;
        listing.website = website;

        emit ListingUpdated(id, name);
    }

    function verifyListing(string memory id) public listingExists(id) {
        listings[id].isVerified = true;
        emit ListingVerified(id, msg.sender);
    }

    function deactivateListing(string memory id) public listingExists(id) onlyOwner(id) {
        listings[id].isActive = false;
        emit ListingDeactivated(id, msg.sender);
    }

    function rateListing(string memory id, uint32 rating) public listingExists(id) {
        require(rating >= 1 && rating <= 5, "InvalidRating");
        Listing storage listing = listings[id];
        require(listing.isActive, "ListingInactive");

        listing.totalRating += rating;
        listing.ratingCount += 1;

        emit ListingRated(id, msg.sender, rating);
    }

    function getListing(string memory id) public view returns (Listing memory) {
        return listings[id];
    }

    function listAll() public view returns (string[] memory) {
        return listingIds;
    }
}
