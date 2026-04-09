// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {ReefCollection} from "../src/ReefCollection.sol";
import {SeaportDeployer} from "../src/vendor/SeaportDeployer.sol";

contract DeployReefStack is Script {
    using stdJson for string;

    struct DeploymentMetadata {
        uint256 chainId;
        string chainName;
        string rpcUrl;
        address deployer;
        address seaport;
        address conduitController;
        address collection;
        string collectionName;
        string collectionSymbol;
    }

    function run() external returns (address collectionAddress) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        uint256 chainId = vm.envOr("REEF_CHAIN_ID", uint256(13939));
        string memory chainName = vm.envOr("REEF_CHAIN_NAME", string("Reef Chain"));
        string memory rpcUrl = vm.envOr("REEF_RPC_URL", string("http://34.123.142.246:8545"));
        string memory collectionName = vm.envOr("COLLECTION_NAME", string("Reef Genesis"));
        string memory collectionSymbol = vm.envOr("COLLECTION_SYMBOL", string("REEF"));
        string memory contractURI = vm.envOr("COLLECTION_CONTRACT_URI", string(""));
        address seaportAddress = vm.envOr("SEAPORT_ADDRESS", address(0));
        address conduitControllerAddress = vm.envOr("CONDUIT_CONTROLLER_ADDRESS", address(0));

        address deployer = vm.addr(privateKey);

        vm.startBroadcast(privateKey);
        if (seaportAddress == address(0) || conduitControllerAddress == address(0)) {
            SeaportDeployer.deployAndConfirm();
            seaportAddress = SeaportDeployer.seaportOnePointSixDeploymentAddress();
            conduitControllerAddress = SeaportDeployer.conduitControllerDeploymentAddress();
        }
        ReefCollection collection = new ReefCollection(
            collectionName,
            collectionSymbol,
            deployer,
            contractURI,
            deployer,
            0
        );
        vm.stopBroadcast();

        collectionAddress = address(collection);
        DeploymentMetadata memory metadata = DeploymentMetadata({
            chainId: chainId,
            chainName: chainName,
            rpcUrl: rpcUrl,
            deployer: deployer,
            seaport: seaportAddress,
            conduitController: conduitControllerAddress,
            collection: collectionAddress,
            collectionName: collectionName,
            collectionSymbol: collectionSymbol
        });
        _writeDeploymentJson(metadata);
    }

    function _writeDeploymentJson(DeploymentMetadata memory metadata) internal {
        string memory json;
        string memory root = "deployment";
        string memory path = string.concat(
            vm.projectRoot(),
            "/deployments/reef-",
            vm.toString(metadata.chainId),
            ".json"
        );

        json = vm.serializeUint(root, "chainId", metadata.chainId);
        json = vm.serializeString(root, "chainName", metadata.chainName);
        json = vm.serializeString(root, "rpcUrl", metadata.rpcUrl);
        json = vm.serializeAddress(root, "deployer", metadata.deployer);
        json = vm.serializeAddress(root, "seaport", metadata.seaport);
        json = vm.serializeAddress(root, "conduitController", metadata.conduitController);
        json = vm.serializeAddress(root, "collection", metadata.collection);
        json = vm.serializeString(root, "collectionName", metadata.collectionName);
        json = vm.serializeString(root, "collectionSymbol", metadata.collectionSymbol);
        vm.writeJson(json, path);
    }
}
