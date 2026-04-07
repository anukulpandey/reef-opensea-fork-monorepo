// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155Holder} from "openzeppelin-contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {IERC1155} from "openzeppelin-contracts/token/ERC1155/IERC1155.sol";

contract ReefMarketplace1155 is ERC1155Holder {
    struct Listing {
        uint256 id;
        address collection;
        address seller;
        uint256 tokenId;
        uint256 quantity;
        uint256 unitPrice;
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
        uint256 unitPrice,
        uint256 quantity
    );
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller,
        address indexed collection,
        uint256 tokenId,
        uint256 quantityRemaining
    );
    event ListingPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        address collection,
        uint256 tokenId,
        uint256 quantity,
        uint256 totalPrice
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
        uint256 quantity,
        uint256 unitPrice
    ) external nonReentrant returns (uint256 listingId) {
        require(collection != address(0), "INVALID_COLLECTION");
        require(quantity > 0, "INVALID_QUANTITY");
        require(unitPrice > 0, "INVALID_PRICE");

        bytes32 assetKey = keccak256(abi.encodePacked(collection, tokenId, msg.sender));
        require(activeListingIdByAsset[assetKey] == 0, "ALREADY_LISTED");

        IERC1155 token = IERC1155(collection);
        token.safeTransferFrom(msg.sender, address(this), tokenId, quantity, "");

        listingId = nextListingId++;
        Listing storage listing = listings[listingId];
        listing.id = listingId;
        listing.collection = collection;
        listing.seller = msg.sender;
        listing.tokenId = tokenId;
        listing.quantity = quantity;
        listing.unitPrice = unitPrice;
        listing.active = true;
        activeListingIdByAsset[assetKey] = listingId;
        emit ListingCreated(listingId, msg.sender, collection, tokenId, unitPrice, quantity);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "LISTING_INACTIVE");
        require(listing.seller == msg.sender, "NOT_SELLER");

        listing.active = false;
        activeListingIdByAsset[
            keccak256(abi.encodePacked(listing.collection, listing.tokenId, listing.seller))
        ] = 0;
        IERC1155(listing.collection).safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId,
            listing.quantity,
            ""
        );
        emit ListingCancelled(
            listingId,
            msg.sender,
            listing.collection,
            listing.tokenId,
            listing.quantity
        );
    }

    function buyListing(uint256 listingId, uint256 quantity) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "LISTING_INACTIVE");
        require(quantity > 0 && quantity <= listing.quantity, "INVALID_QUANTITY");

        uint256 totalPrice = listing.unitPrice * quantity;
        require(msg.value == totalPrice, "INCORRECT_VALUE");

        listing.quantity -= quantity;
        if (listing.quantity == 0) {
            listing.active = false;
            activeListingIdByAsset[
                keccak256(abi.encodePacked(listing.collection, listing.tokenId, listing.seller))
            ] = 0;
        }

        (bool sent, ) = payable(listing.seller).call{value: msg.value}("");
        require(sent, "PAYMENT_FAILED");
        IERC1155(listing.collection).safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId,
            quantity,
            ""
        );

        emit ListingPurchased(
            listingId,
            msg.sender,
            listing.seller,
            listing.collection,
            listing.tokenId,
            quantity,
            totalPrice
        );
    }
}
