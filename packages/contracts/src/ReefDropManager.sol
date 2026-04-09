// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";

contract ReefDropManager is Ownable {
    enum Stage {
        Draft,
        Live,
        Upcoming,
        Ended
    }

    struct DropInput {
        string slug;
        string name;
        string creatorName;
        string creatorSlug;
        string coverUrl;
        uint8 stage;
        string mintPrice;
        uint256 supply;
        string startLabel;
        string description;
    }

    struct Drop {
        bool exists;
        bool archived;
        uint8 stage;
        uint256 supply;
        uint64 updatedAt;
        string slug;
        string name;
        string creatorName;
        string creatorSlug;
        string coverUrl;
        string mintPrice;
        string startLabel;
        string description;
    }

    string[] private _dropSlugs;
    mapping(bytes32 => Drop) private _drops;

    event DropUpserted(
        string indexed slug,
        string name,
        string creatorName,
        uint8 stage,
        bool created
    );
    event DropArchived(string indexed slug);

    function upsertDrop(
        DropInput calldata input
    ) external onlyOwner returns (bool created) {
        require(bytes(input.slug).length > 0, "INVALID_SLUG");
        require(bytes(input.name).length > 0, "INVALID_NAME");
        require(bytes(input.creatorName).length > 0, "INVALID_CREATOR");
        require(bytes(input.coverUrl).length > 0, "INVALID_COVER");
        require(bytes(input.mintPrice).length > 0, "INVALID_PRICE");
        require(bytes(input.startLabel).length > 0, "INVALID_START");
        require(bytes(input.description).length > 0, "INVALID_DESCRIPTION");
        require(input.stage <= uint8(Stage.Ended), "INVALID_STAGE");

        bytes32 key = keccak256(bytes(input.slug));
        Drop storage drop = _drops[key];
        created = !drop.exists;

        if (created) {
            drop.exists = true;
            drop.slug = input.slug;
            _dropSlugs.push(input.slug);
        }

        drop.archived = false;
        drop.stage = input.stage;
        drop.supply = input.supply;
        drop.updatedAt = uint64(block.timestamp);
        drop.name = input.name;
        drop.creatorName = input.creatorName;
        drop.creatorSlug = input.creatorSlug;
        drop.coverUrl = input.coverUrl;
        drop.mintPrice = input.mintPrice;
        drop.startLabel = input.startLabel;
        drop.description = input.description;

        emit DropUpserted(input.slug, input.name, input.creatorName, input.stage, created);
    }

    function archiveDrop(string calldata slug) external onlyOwner {
        bytes32 key = keccak256(bytes(slug));
        Drop storage drop = _drops[key];
        require(drop.exists, "DROP_NOT_FOUND");

        drop.archived = true;
        drop.updatedAt = uint64(block.timestamp);

        emit DropArchived(slug);
    }

    function dropCount() external view returns (uint256) {
        return _dropSlugs.length;
    }

    function dropSlugAt(uint256 index) external view returns (string memory) {
        require(index < _dropSlugs.length, "INDEX_OUT_OF_BOUNDS");
        return _dropSlugs[index];
    }

    function getDrop(
        string calldata slug
    )
        external
        view
        returns (
            bool exists,
            bool archived,
            uint8 stage,
            uint256 supply,
            uint64 updatedAt,
            string memory storedSlug,
            string memory name,
            string memory creatorName,
            string memory creatorSlug,
            string memory coverUrl,
            string memory mintPrice,
            string memory startLabel,
            string memory description
        )
    {
        return _encodeDrop(_drops[keccak256(bytes(slug))]);
    }

    function getDropAt(
        uint256 index
    )
        external
        view
        returns (
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
        )
    {
        require(index < _dropSlugs.length, "INDEX_OUT_OF_BOUNDS");
        return _encodeDrop(_drops[keccak256(bytes(_dropSlugs[index]))]);
    }

    function _encodeDrop(
        Drop storage drop
    )
        internal
        view
        returns (
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
        )
    {
        return (
            drop.exists,
            drop.archived,
            drop.stage,
            drop.supply,
            drop.updatedAt,
            drop.slug,
            drop.name,
            drop.creatorName,
            drop.creatorSlug,
            drop.coverUrl,
            drop.mintPrice,
            drop.startLabel,
            drop.description
        );
    }
}
