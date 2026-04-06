// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "solmate/tokens/ERC721.sol";

contract ReefMarketplace {
    struct Listing {
        uint256 id;
        address seller;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    address public immutable managedCollection;
    uint256 public nextListingId = 1;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => uint256) public activeListingIdByToken;

    uint256 private locked = 1;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed collection,
        uint256 tokenId,
        uint256 price
    );
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller,
        address indexed collection,
        uint256 tokenId
    );
    event ListingPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        address collection,
        uint256 tokenId,
        uint256 price
    );

    modifier nonReentrant() {
        require(locked == 1, "REENTRANCY");
        locked = 2;
        _;
        locked = 1;
    }

    constructor(address managedCollection_) {
        require(managedCollection_ != address(0), "ZERO_COLLECTION");
        managedCollection = managedCollection_;
    }

    function createListing(uint256 tokenId, uint256 price)
        external
        nonReentrant
        returns (uint256 listingId)
    {
        require(price > 0, "INVALID_PRICE");
        require(activeListingIdByToken[tokenId] == 0, "ALREADY_LISTED");

        ERC721 collection = ERC721(managedCollection);
        require(collection.ownerOf(tokenId) == msg.sender, "NOT_OWNER");

        bool approvedForAll = collection.isApprovedForAll(msg.sender, address(this));
        bool approvedForToken = collection.getApproved(tokenId) == address(this);
        require(approvedForAll || approvedForToken, "NOT_APPROVED");

        listingId = nextListingId++;
        listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            tokenId: tokenId,
            price: price,
            active: true
        });
        activeListingIdByToken[tokenId] = listingId;

        collection.transferFrom(msg.sender, address(this), tokenId);

        emit ListingCreated(listingId, msg.sender, managedCollection, tokenId, price);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "LISTING_INACTIVE");
        require(listing.seller == msg.sender, "NOT_SELLER");

        listing.active = false;
        activeListingIdByToken[listing.tokenId] = 0;
        ERC721(managedCollection).transferFrom(address(this), msg.sender, listing.tokenId);

        emit ListingCancelled(listingId, msg.sender, managedCollection, listing.tokenId);
    }

    function buyListing(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "LISTING_INACTIVE");
        require(msg.value == listing.price, "INCORRECT_VALUE");

        listing.active = false;
        activeListingIdByToken[listing.tokenId] = 0;

        (bool sent,) = payable(listing.seller).call{value: msg.value}("");
        require(sent, "PAYMENT_FAILED");

        ERC721(managedCollection).transferFrom(address(this), msg.sender, listing.tokenId);

        emit ListingPurchased(
            listingId,
            msg.sender,
            listing.seller,
            managedCollection,
            listing.tokenId,
            listing.price
        );
    }
}
