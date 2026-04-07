// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {ReefCollection} from "../src/ReefCollection.sol";
import {ReefCollectionFactory721} from "../src/ReefCollectionFactory721.sol";

contract ReefCollectionTest is Test {
    ReefCollectionFactory721 internal factory;

    address internal creator = address(0xA11CE);
    address internal collector = address(0xB0B);

    function setUp() public {
        factory = new ReefCollectionFactory721();
    }

    function testFactoryCreatesOwnedCollection() public {
        vm.prank(creator);
        address collectionAddress =
            factory.createCollection("Ben 10 Aliens", "ALIEN", "ipfs://contract-metadata");

        ReefCollection collection = ReefCollection(collectionAddress);
        assertEq(collection.owner(), creator);
        assertEq(collection.name(), "Ben 10 Aliens");
        assertEq(collection.symbol(), "ALIEN");
        assertEq(collection.contractURI(), "ipfs://contract-metadata");
    }

    function testOwnerCanMintAndSetTokenUri() public {
        vm.prank(creator);
        address collectionAddress =
            factory.createCollection("Heatblast", "HEAT", "ipfs://contract");
        ReefCollection collection = ReefCollection(collectionAddress);

        vm.prank(creator);
        uint256 tokenId = collection.mintTo(collector, "ipfs://heatblast-1");

        assertEq(tokenId, 1);
        assertEq(collection.ownerOf(tokenId), collector);
        assertEq(collection.tokenURI(tokenId), "ipfs://heatblast-1");
    }

    function testNonOwnerCannotMint() public {
        vm.prank(creator);
        address collectionAddress =
            factory.createCollection("Four Arms", "ARMS", "ipfs://contract");
        ReefCollection collection = ReefCollection(collectionAddress);

        vm.prank(collector);
        vm.expectRevert(bytes("NOT_OWNER"));
        collection.mintTo(collector, "ipfs://four-arms-1");
    }
}
