// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {ReefEditionFactory} from "../src/ReefEditionFactory.sol";
import {ReefMarketplace1155} from "../src/ReefMarketplace1155.sol";
import {ReefOpenEdition1155} from "../src/ReefOpenEdition1155.sol";

contract ReefEditionMarketplace1155Test is Test {
    ReefEditionFactory internal factory;
    ReefMarketplace1155 internal marketplace;

    address internal creator = address(0xCAFE);
    address internal buyer = address(0xB0B);

    function setUp() public {
        factory = new ReefEditionFactory();
        marketplace = new ReefMarketplace1155();
    }

    function testFactoryCreatesOwnedEditionCollection() public {
        vm.prank(creator);
        address collectionAddress = factory.createCollection(
            "Ben 10 Editions",
            "BEN10",
            "ipfs://edition-contract",
            500
        );

        ReefOpenEdition1155 collection = ReefOpenEdition1155(collectionAddress);
        assertEq(collection.owner(), creator);
        assertEq(collection.name(), "Ben 10 Editions");
        assertEq(collection.symbol(), "BEN10");
        assertEq(collection.contractURI(), "ipfs://edition-contract");
    }

    function testMintAndTradeEditionListing() public {
        vm.prank(creator);
        address collectionAddress = factory.createCollection(
            "Ben 10 Editions",
            "BEN10",
            "ipfs://edition-contract",
            500
        );
        ReefOpenEdition1155 collection = ReefOpenEdition1155(collectionAddress);

        vm.prank(creator);
        uint256 tokenId = collection.mintCreator(creator, 5, "ipfs://token-1");

        vm.startPrank(creator);
        collection.setApprovalForAll(address(marketplace), true);
        uint256 listingId =
            marketplace.createListing(address(collection), tokenId, 3, 1 ether);
        vm.stopPrank();

        assertEq(collection.balanceOf(address(marketplace), tokenId), 3);
        assertEq(collection.balanceOf(creator, tokenId), 2);

        vm.deal(buyer, 4 ether);
        vm.prank(buyer);
        marketplace.buyListing{value: 2 ether}(listingId, 2);

        (, , , , uint256 quantityRemaining, uint256 unitPrice, bool active) =
            marketplace.listings(listingId);
        assertEq(quantityRemaining, 1);
        assertEq(unitPrice, 1 ether);
        assertTrue(active);
        assertEq(collection.balanceOf(buyer, tokenId), 2);

        vm.prank(creator);
        marketplace.cancelListing(listingId);

        (, , , , uint256 finalQuantity, , bool finalActive) = marketplace.listings(listingId);
        assertEq(finalQuantity, 1);
        assertFalse(finalActive);
        assertEq(collection.balanceOf(creator, tokenId), 3);
    }
}
