// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Clones} from "openzeppelin-contracts/proxy/Clones.sol";

import {ReefSeaDropCollection} from "./ReefSeaDropCollection.sol";

/**
 * @title ReefCreatorFactory
 * @notice Deploys SeaDrop-compatible collection clones for Reef creators.
 */
contract ReefCreatorFactory {
    struct CreateCollectionConfig {
        string baseURI;
        string contractURI;
        string dropURI;
        uint256 maxSupply;
        address creatorPayoutAddress;
        uint96 royaltyBps;
        uint80 mintPrice;
        uint48 startTime;
        uint48 endTime;
        uint16 maxTotalMintableByWallet;
        uint16 feeBps;
        bool restrictFeeRecipients;
    }

    address public immutable seaDrop;
    address public immutable collectionImplementation;

    event CollectionCreated(
        address indexed creator,
        address indexed collection,
        string name,
        string symbol,
        bytes32 salt
    );

    constructor(address seaDrop_) {
        require(seaDrop_ != address(0), "INVALID_SEADROP");
        seaDrop = seaDrop_;
        collectionImplementation = address(new ReefSeaDropCollection());
    }

    function createCollection(
        string calldata name_,
        string calldata symbol_,
        CreateCollectionConfig calldata config,
        bytes32 salt_
    ) external returns (address collection) {
        bytes32 cloneSalt = keccak256(
            abi.encodePacked(msg.sender, salt_, block.chainid)
        );

        collection = Clones.cloneDeterministic(
            collectionImplementation,
            cloneSalt
        );

        address payoutAddress = config.creatorPayoutAddress == address(0)
            ? msg.sender
            : config.creatorPayoutAddress;

        ReefSeaDropCollection(collection).initializeCollection(
            name_,
            symbol_,
            ReefSeaDropCollection.InitConfig({
                seaDrop: seaDrop,
                initialOwner: msg.sender,
                baseURI: config.baseURI,
                contractURI: config.contractURI,
                dropURI: config.dropURI,
                maxSupply: config.maxSupply,
                creatorPayoutAddress: payoutAddress,
                royaltyBps: config.royaltyBps,
                mintPrice: config.mintPrice,
                startTime: config.startTime,
                endTime: config.endTime,
                maxTotalMintableByWallet: config.maxTotalMintableByWallet,
                feeBps: config.feeBps,
                restrictFeeRecipients: config.restrictFeeRecipients
            })
        );

        emit CollectionCreated(msg.sender, collection, name_, symbol_, salt_);
    }

    function predictCollectionAddress(
        address creator,
        bytes32 salt_
    ) external view returns (address) {
        bytes32 cloneSalt = keccak256(
            abi.encodePacked(creator, salt_, block.chainid)
        );
        return
            Clones.predictDeterministicAddress(
                collectionImplementation,
                cloneSalt,
                address(this)
            );
    }
}
