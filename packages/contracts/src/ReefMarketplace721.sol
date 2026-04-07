// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "openzeppelin-contracts/token/ERC721/IERC721.sol";

contract ReefMarketplace721 {
    struct Listing {
        uint256 id;
        address collection;
        address seller;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    uint256 public nextListingId = 1;
    mapping(uint256 => Listing) public listings;
    mapping(bytes32 => uint256) public activeListingIdByAsset;

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

    function createListing(
        address collection,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant returns (uint256 listingId) {
        require(collection != address(0), "INVALID_COLLECTION");
        require(price > 0, "INVALID_PRICE");

        bytes32 assetKey = keccak256(abi.encodePacked(collection, tokenId));
        require(activeListingIdByAsset[assetKey] == 0, "ALREADY_LISTED");

        IERC721 token = IERC721(collection);
        token.transferFrom(msg.sender, address(this), tokenId);

        listingId = nextListingId++;
        Listing storage listing = listings[listingId];
        listing.id = listingId;
        listing.collection = collection;
        listing.seller = msg.sender;
        listing.tokenId = tokenId;
        listing.price = price;
        listing.active = true;
        activeListingIdByAsset[assetKey] = listingId;
        emit ListingCreated(listingId, msg.sender, collection, tokenId, price);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "LISTING_INACTIVE");
        require(listing.seller == msg.sender, "NOT_SELLER");

        listing.active = false;
        activeListingIdByAsset[
            keccak256(abi.encodePacked(listing.collection, listing.tokenId))
        ] = 0;
        IERC721(listing.collection).transferFrom(address(this), msg.sender, listing.tokenId);
        emit ListingCancelled(listingId, msg.sender, listing.collection, listing.tokenId);
    }

    function buyListing(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "LISTING_INACTIVE");
        require(msg.value == listing.price, "INCORRECT_VALUE");

        listing.active = false;
        activeListingIdByAsset[
            keccak256(abi.encodePacked(listing.collection, listing.tokenId))
        ] = 0;

        (bool sent, ) = payable(listing.seller).call{value: msg.value}("");
        require(sent, "PAYMENT_FAILED");
        IERC721(listing.collection).transferFrom(address(this), msg.sender, listing.tokenId);
        emit ListingPurchased(
            listingId,
            msg.sender,
            listing.seller,
            listing.collection,
            listing.tokenId,
            listing.price
        );
    }
}
