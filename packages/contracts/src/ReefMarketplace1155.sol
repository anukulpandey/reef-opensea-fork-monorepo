// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {IERC165} from "openzeppelin-contracts/interfaces/IERC165.sol";
import {IERC2981} from "openzeppelin-contracts/interfaces/IERC2981.sol";
import {IERC1155} from "openzeppelin-contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "openzeppelin-contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract ReefMarketplace1155 is ERC1155Holder, Ownable {
    struct Listing {
        uint256 id;
        address collection;
        address seller;
        uint256 tokenId;
        uint256 quantity;
        uint256 unitPrice;
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
        uint256 quantity,
        uint256 unitPrice
    ) external nonReentrant returns (uint256 listingId) {
        require(collection != address(0), "INVALID_COLLECTION");
        require(quantity > 0, "INVALID_QUANTITY");
        require(unitPrice > 0, "INVALID_PRICE");

        bytes32 assetKey = _assetKey(collection, tokenId, msg.sender);
        require(activeListingIdByAsset[assetKey] == 0, "ALREADY_LISTED");

        IERC1155 token = IERC1155(collection);
        require(token.balanceOf(msg.sender, tokenId) >= quantity, "INSUFFICIENT_BALANCE");
        token.safeTransferFrom(msg.sender, address(this), tokenId, quantity, "");

        listingId = nextListingId++;
        listings[listingId] = Listing({
            id: listingId,
            collection: collection,
            seller: msg.sender,
            tokenId: tokenId,
            quantity: quantity,
            unitPrice: unitPrice,
            active: true
        });
        activeListingIdByAsset[assetKey] = listingId;

        emit ListingCreated(listingId, msg.sender, collection, tokenId, unitPrice, quantity);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "LISTING_INACTIVE");
        require(listing.seller == msg.sender, "NOT_SELLER");

        listing.active = false;
        activeListingIdByAsset[_assetKey(listing.collection, listing.tokenId, listing.seller)] = 0;

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
            activeListingIdByAsset[_assetKey(listing.collection, listing.tokenId, listing.seller)] = 0;
        }

        (address royaltyReceiver, uint256 royaltyAmount) =
            _resolveRoyalty(listing.collection, listing.tokenId, totalPrice);
        uint256 platformFeeAmount = _feeAmount(totalPrice, platformFeeBps);
        require(royaltyAmount + platformFeeAmount <= totalPrice, "INVALID_FEES");

        if (platformFeeAmount > 0) {
            _safeTransferNative(feeRecipient, platformFeeAmount);
        }
        if (royaltyAmount > 0) {
            _safeTransferNative(royaltyReceiver, royaltyAmount);
        }

        _safeTransferNative(
            listing.seller,
            totalPrice - royaltyAmount - platformFeeAmount
        );

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

    function _assetKey(
        address collection,
        uint256 tokenId,
        address seller
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(collection, tokenId, seller));
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
