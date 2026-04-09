// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {ReefDropManager} from "../src/ReefDropManager.sol";

contract ReefDropManagerTest is Test {
    ReefDropManager internal dropManager;

    address internal admin = address(0xA11CE);

    function setUp() public {
        vm.prank(admin);
        dropManager = new ReefDropManager();
    }

    function testOwnerCanCreateAndReadDrop() public {
        vm.prank(admin);
        bool created = dropManager.upsertDrop(
            ReefDropManager.DropInput({
                slug: "heatblast-launch",
                name: "Heatblast Launch",
                creatorName: "Reef Team",
                creatorSlug: "reef-team",
                coverUrl: "ipfs://drop-cover",
                stage: 1,
                mintPrice: "1 REEF",
                supply: 250,
                startLabel: "Live now",
                description: "Featured creator drop."
            })
        );

        assertTrue(created);
        assertEq(dropManager.dropCount(), 1);

        (
            bool exists,
            bool archived,
            uint8 stage,
            uint256 supply,
            ,
            string memory slug,
            string memory name,
            string memory creatorName,
            string memory creatorSlug,
            string memory coverUrl,
            string memory mintPrice,
            string memory startLabel,
            string memory description
        ) = dropManager.getDropAt(0);

        assertTrue(exists);
        assertFalse(archived);
        assertEq(stage, 1);
        assertEq(supply, 250);
        assertEq(slug, "heatblast-launch");
        assertEq(name, "Heatblast Launch");
        assertEq(creatorName, "Reef Team");
        assertEq(creatorSlug, "reef-team");
        assertEq(coverUrl, "ipfs://drop-cover");
        assertEq(mintPrice, "1 REEF");
        assertEq(startLabel, "Live now");
        assertEq(description, "Featured creator drop.");
    }

    function testOwnerCanArchiveDrop() public {
        vm.startPrank(admin);
        dropManager.upsertDrop(
            ReefDropManager.DropInput({
                slug: "cannonbolt-drop",
                name: "Cannonbolt Drop",
                creatorName: "Reef Team",
                creatorSlug: "reef-team",
                coverUrl: "ipfs://drop-cover",
                stage: 2,
                mintPrice: "2 REEF",
                supply: 100,
                startLabel: "Tomorrow",
                description: "Upcoming drop."
            })
        );
        dropManager.archiveDrop("cannonbolt-drop");
        vm.stopPrank();

        (
            bool exists,
            bool archived,
            uint8 stage,
            uint256 supply,
            uint64 updatedAt,
            string memory slug,
            string memory name,
            string memory creatorName,
            string memory creatorSlug,
            string memory coverUrl,
            string memory mintPrice,
            string memory startLabel,
            string memory description
        ) = dropManager.getDrop("cannonbolt-drop");

        assertTrue(exists);
        assertTrue(archived);
        assertEq(stage, 2);
        assertEq(supply, 100);
        assertGt(updatedAt, 0);
        assertEq(slug, "cannonbolt-drop");
        assertEq(name, "Cannonbolt Drop");
        assertEq(creatorName, "Reef Team");
        assertEq(creatorSlug, "reef-team");
        assertEq(coverUrl, "ipfs://drop-cover");
        assertEq(mintPrice, "2 REEF");
        assertEq(startLabel, "Tomorrow");
        assertEq(description, "Upcoming drop.");
    }
}
