// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReefCollection} from "./ReefCollection.sol";

contract ReefCollectionFactory721 {
    event CollectionCreated(
        address indexed creator,
        address indexed collection,
        string name,
        string symbol
    );

    function createCollection(
        string calldata name_,
        string calldata symbol_,
        string calldata contractMetadataUri_
    ) external returns (address collection) {
        collection = address(
            new ReefCollection(name_, symbol_, msg.sender, contractMetadataUri_)
        );
        emit CollectionCreated(msg.sender, collection, name_, symbol_);
    }
}
