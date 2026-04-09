// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {ERC721} from "openzeppelin-contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "openzeppelin-contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC2981} from "openzeppelin-contracts/token/common/ERC2981.sol";

contract ReefCollection is ERC721, ERC721URIStorage, ERC2981, Ownable {
    uint256 public nextTokenId = 1;

    string private _contractMetadataUri;

    event CreatorMint(
        address indexed operator,
        address indexed to,
        uint256 indexed tokenId,
        string tokenURI
    );

    constructor(
        string memory name_,
        string memory symbol_,
        address initialOwner_,
        string memory contractMetadataUri_,
        address royaltyReceiver_,
        uint96 royaltyBps_
    ) ERC721(name_, symbol_) {
        require(initialOwner_ != address(0), "ZERO_OWNER");

        _contractMetadataUri = contractMetadataUri_;
        transferOwnership(initialOwner_);

        if (royaltyReceiver_ != address(0) && royaltyBps_ > 0) {
            _setDefaultRoyalty(royaltyReceiver_, royaltyBps_);
        }
    }

    function contractURI() external view returns (string memory) {
        return _contractMetadataUri;
    }

    function setContractURI(string calldata contractMetadataUri_) external onlyOwner {
        _contractMetadataUri = contractMetadataUri_;
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        if (receiver == address(0) || feeNumerator == 0) {
            _deleteDefaultRoyalty();
            return;
        }

        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function mintTo(
        address to,
        string calldata tokenUri_
    ) external onlyOwner returns (uint256 tokenId) {
        return _mintCreator(to, tokenUri_);
    }

    function mintCreator(
        address to,
        string calldata tokenUri_
    ) external onlyOwner returns (uint256 tokenId) {
        return _mintCreator(to, tokenUri_);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _mintCreator(
        address to,
        string calldata tokenUri_
    ) internal returns (uint256 tokenId) {
        require(to != address(0), "ZERO_RECIPIENT");

        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri_);

        emit CreatorMint(msg.sender, to, tokenId, tokenUri_);
    }
}
