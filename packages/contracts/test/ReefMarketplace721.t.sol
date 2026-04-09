// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {ReefCollection} from "../src/ReefCollection.sol";
import {ReefMarketplace721} from "../src/ReefMarketplace721.sol";

contract ReefMarketplace721Test is Test {
    ReefCollection internal collection;
    ReefMarketplace721 internal marketplace;

    address internal seller = address(0xA11CE);
    address internal buyer = address(0xB0B);
    address internal royaltyReceiver = address(0xC0DE);

    function setUp() public {
        collection = new ReefCollection(
            "Heatblast",
            "HEAT",
            seller,
            "ipfs://contract",
            royaltyReceiver,
            500
        );
        marketplace = new ReefMarketplace721();

        vm.prank(seller);
        collection.mintTo(seller, "ipfs://heatblast-1");
    }

    function testCreateListingEscrowsTheToken() public {
        vm.startPrank(seller);
        collection.approve(address(marketplace), 1);
        uint256 listingId = marketplace.createListing(address(collection), 1, 1 ether);
        vm.stopPrank();

        (uint256 id, address listedCollection, address listedSeller, uint256 tokenId, uint256 price, bool active) =
            marketplace.listings(listingId);
        assertEq(id, 1);
        assertEq(listedCollection, address(collection));
        assertEq(listedSeller, seller);
        assertEq(tokenId, 1);
        assertEq(price, 1 ether);
        assertTrue(active);
        assertEq(collection.ownerOf(1), address(marketplace));
    }

    function testCancelListingReturnsTheToken() public {
        vm.startPrank(seller);
        collection.approve(address(marketplace), 1);
        uint256 listingId = marketplace.createListing(address(collection), 1, 1 ether);
        marketplace.cancelListing(listingId);
        vm.stopPrank();

        (, , , , , bool active) = marketplace.listings(listingId);
        assertFalse(active);
        assertEq(collection.ownerOf(1), seller);
    }

    function testBuyListingTransfersTokenAndPaysSeller() public {
        vm.startPrank(seller);
        collection.approve(address(marketplace), 1);
        uint256 listingId = marketplace.createListing(address(collection), 1, 1 ether);
        vm.stopPrank();

        vm.deal(buyer, 2 ether);
        uint256 sellerBalanceBefore = seller.balance;

        vm.prank(buyer);
        marketplace.buyListing{value: 1 ether}(listingId);

        (, , , , , bool active) = marketplace.listings(listingId);
        assertFalse(active);
        assertEq(collection.ownerOf(1), buyer);
        assertEq(seller.balance, sellerBalanceBefore + 0.95 ether);
    }

    function testBuyListingPaysRoyaltyRecipient() public {
        vm.startPrank(seller);
        collection.approve(address(marketplace), 1);
        uint256 listingId = marketplace.createListing(address(collection), 1, 1 ether);
        vm.stopPrank();

        vm.deal(buyer, 2 ether);
        uint256 royaltyBalanceBefore = royaltyReceiver.balance;
        uint256 sellerBalanceBefore = seller.balance;

        vm.prank(buyer);
        marketplace.buyListing{value: 1 ether}(listingId);

        assertEq(royaltyReceiver.balance, royaltyBalanceBefore + 0.05 ether);
        assertEq(seller.balance, sellerBalanceBefore + 0.95 ether);
    }
}
