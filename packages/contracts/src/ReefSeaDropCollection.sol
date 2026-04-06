// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC721SeaDropCloneable} from "seadrop/clones/ERC721SeaDropCloneable.sol";
import {
    ISeaDropTokenContractMetadata
} from "seadrop/interfaces/ISeaDropTokenContractMetadata.sol";
import {PublicDrop} from "seadrop/lib/SeaDropStructs.sol";

/**
 * @title ReefSeaDropCollection
 * @notice Reef-specific SeaDrop-compatible ERC721 collection with one extra owner mint helper.
 */
contract ReefSeaDropCollection is ERC721SeaDropCloneable {
    struct InitConfig {
        address seaDrop;
        address initialOwner;
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

    event OwnerMint(address indexed to, uint256 quantity, uint256 startingTokenId);

    constructor() {
        _disableInitializers();
    }

    function initializeCollection(
        string calldata name_,
        string calldata symbol_,
        InitConfig calldata config
    ) external initializer {
        if (config.seaDrop == address(0)) {
            revert OnlyAllowedSeaDrop();
        }

        address[] memory allowedSeaDrop = new address[](1);
        allowedSeaDrop[0] = config.seaDrop;

        __ERC721ACloneable__init(name_, symbol_);
        __ReentrancyGuard_init();
        _allowedSeaDrop[config.seaDrop] = true;
        _enumeratedAllowedSeaDrop = allowedSeaDrop;
        _transferOwnership(config.initialOwner);
        emit SeaDropTokenDeployed();

        if (config.maxSupply > 0) {
            this.setMaxSupply(config.maxSupply);
        }
        if (bytes(config.baseURI).length != 0) {
            this.setBaseURI(config.baseURI);
        }
        if (bytes(config.contractURI).length != 0) {
            this.setContractURI(config.contractURI);
        }
        if (config.creatorPayoutAddress != address(0)) {
            this.updateCreatorPayoutAddress(
                config.seaDrop,
                config.creatorPayoutAddress
            );
        }
        if (
            config.royaltyBps > 0 &&
            config.creatorPayoutAddress != address(0)
        ) {
            this.setRoyaltyInfo(
                ISeaDropTokenContractMetadata.RoyaltyInfo({
                    royaltyAddress: config.creatorPayoutAddress,
                    royaltyBps: config.royaltyBps
                })
            );
        }
        if (config.startTime != 0 || config.endTime != 0) {
            this.updatePublicDrop(
                config.seaDrop,
                PublicDrop({
                    mintPrice: config.mintPrice,
                    startTime: config.startTime,
                    endTime: config.endTime,
                    maxTotalMintableByWallet: config.maxTotalMintableByWallet,
                    feeBps: config.feeBps,
                    restrictFeeRecipients: config.restrictFeeRecipients
                })
            );
        }
        if (bytes(config.dropURI).length != 0) {
            this.updateDropURI(config.seaDrop, config.dropURI);
        }
    }

    function ownerMint(address to, uint256 quantity) external onlyOwner {
        uint256 newTotalMinted = _totalMinted() + quantity;
        uint256 currentMaxSupply = maxSupply();
        if (currentMaxSupply != 0 && newTotalMinted > currentMaxSupply) {
            revert MintQuantityExceedsMaxSupply(newTotalMinted, currentMaxSupply);
        }

        uint256 startingTokenId = _nextTokenId();
        _safeMint(to, quantity);
        emit OwnerMint(to, quantity, startingTokenId);
    }
}
