// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReefOpenEdition1155} from "./ReefOpenEdition1155.sol";

contract ReefEditionFactory {
    event CollectionCreated(
        address indexed creator,
        address indexed collection,
        string name,
        string symbol
    );

    function createCollection(
        string calldata name_,
        string calldata symbol_,
        string calldata contractMetadataUri_,
        uint96 royaltyBps_
    ) external returns (address collection) {
        collection = address(
            new ReefOpenEdition1155(
                name_,
                symbol_,
                contractMetadataUri_,
                msg.sender,
                msg.sender,
                royaltyBps_
            )
        );
        emit CollectionCreated(msg.sender, collection, name_, symbol_);
    }
}
