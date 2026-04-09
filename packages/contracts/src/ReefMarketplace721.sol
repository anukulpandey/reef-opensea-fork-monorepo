// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {IERC165} from "openzeppelin-contracts/interfaces/IERC165.sol";
import {IERC2981} from "openzeppelin-contracts/interfaces/IERC2981.sol";
import {IERC721} from "openzeppelin-contracts/token/ERC721/IERC721.sol";

contract ReefMarketplace721 is Ownable {
    struct Listing {
        uint256 id;
        address collection;
        address seller;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    uint96 public platformFeeBps;
    address public feeRecipient;
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
    event MarketplaceFeesUpdated(address indexed feeRecipient, uint96 platformFeeBps);

    modifier nonReentrant() {
        require(locked == 1, "REENTRANCY");
        locked = 2;
        _;
        locked = 1;
    }

    constructor() {
        feeRecipient = msg.sender;
    }

    function setMarketplaceFees(address feeRecipient_, uint96 platformFeeBps_) external onlyOwner {
        require(platformFeeBps_ <= 2_500, "FEE_TOO_HIGH");
        if (platformFeeBps_ > 0) {
            require(feeRecipient_ != address(0), "INVALID_RECIPIENT");
        }

        feeRecipient = feeRecipient_;
        platformFeeBps = platformFeeBps_;
        emit MarketplaceFeesUpdated(feeRecipient_, platformFeeBps_);
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
        require(token.ownerOf(tokenId) == msg.sender, "NOT_OWNER");
        token.transferFrom(msg.sender, address(this), tokenId);

        listingId = nextListingId++;
        listings[listingId] = Listing({
            id: listingId,
            collection: collection,
            seller: msg.sender,
            tokenId: tokenId,
            price: price,
            active: true
        });
        activeListingIdByAsset[assetKey] = listingId;

        emit ListingCreated(listingId, msg.sender, collection, tokenId, price);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "LISTING_INACTIVE");
        require(listing.seller == msg.sender, "NOT_SELLER");

        listing.active = false;
        activeListingIdByAsset[_assetKey(listing.collection, listing.tokenId)] = 0;

        IERC721(listing.collection).transferFrom(address(this), msg.sender, listing.tokenId);
        emit ListingCancelled(listingId, msg.sender, listing.collection, listing.tokenId);
    }

    function buyListing(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "LISTING_INACTIVE");
        require(msg.value == listing.price, "INCORRECT_VALUE");

        listing.active = false;
        activeListingIdByAsset[_assetKey(listing.collection, listing.tokenId)] = 0;

        (address royaltyReceiver, uint256 royaltyAmount) =
            _resolveRoyalty(listing.collection, listing.tokenId, listing.price);
        uint256 platformFeeAmount = _feeAmount(listing.price, platformFeeBps);
        require(royaltyAmount + platformFeeAmount <= listing.price, "INVALID_FEES");

        if (platformFeeAmount > 0) {
            _safeTransferNative(feeRecipient, platformFeeAmount);
        }
        if (royaltyAmount > 0) {
            _safeTransferNative(royaltyReceiver, royaltyAmount);
        }

        _safeTransferNative(
            listing.seller,
            listing.price - royaltyAmount - platformFeeAmount
        );

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

    function _assetKey(address collection, uint256 tokenId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(collection, tokenId));
    }

    function _feeAmount(uint256 amount, uint96 feeBps) internal pure returns (uint256) {
        return (amount * feeBps) / 10_000;
    }

    function _resolveRoyalty(
        address collection,
        uint256 tokenId,
        uint256 salePrice
    ) internal view returns (address receiver, uint256 amount) {
        if (salePrice == 0) {
            return (address(0), 0);
        }

        try IERC165(collection).supportsInterface(type(IERC2981).interfaceId) returns (bool supported) {
            if (!supported) {
                return (address(0), 0);
            }
        } catch {
            return (address(0), 0);
        }

        try IERC2981(collection).royaltyInfo(tokenId, salePrice) returns (
            address royaltyReceiver,
            uint256 royaltyAmount
        ) {
            if (royaltyReceiver == address(0) || royaltyAmount == 0) {
                return (address(0), 0);
            }
            return (royaltyReceiver, royaltyAmount);
        } catch {
            return (address(0), 0);
        }
    }

    function _safeTransferNative(address recipient, uint256 amount) internal {
        require(recipient != address(0), "INVALID_RECIPIENT");

        (bool sent, ) = payable(recipient).call{value: amount}("");
        require(sent, "PAYMENT_FAILED");
    }
}
