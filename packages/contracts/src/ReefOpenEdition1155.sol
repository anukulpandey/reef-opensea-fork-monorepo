// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "openzeppelin-contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {ERC2981} from "openzeppelin-contracts/token/common/ERC2981.sol";

contract ReefOpenEdition1155 is ERC1155, Ownable, ERC2981 {
    string public name;
    string public symbol;
    string private _contractMetadataUri;
    uint256 public nextTokenId = 1;

    mapping(uint256 => string) private _tokenUris;
    mapping(uint256 => uint256) public totalSupply;

    event CreatorMint(
        address indexed to,
        uint256 indexed tokenId,
        uint256 quantity,
        string tokenURI
    );

    constructor(
        string memory name_,
        string memory symbol_,
        string memory contractMetadataUri_,
        address initialOwner_,
        address royaltyReceiver_,
        uint96 royaltyBps_
    ) ERC1155("") {
        require(initialOwner_ != address(0), "ZERO_OWNER");
        name = name_;
        symbol = symbol_;
        _contractMetadataUri = contractMetadataUri_;
        _transferOwnership(initialOwner_);
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

    function mintCreator(
        address to,
        uint256 quantity,
        string calldata tokenUri_
    ) external onlyOwner returns (uint256 tokenId) {
        require(quantity > 0, "INVALID_QUANTITY");
        require(to != address(0), "ZERO_RECIPIENT");
        tokenId = nextTokenId++;
        _mint(to, tokenId, quantity, "");
        _tokenUris[tokenId] = tokenUri_;
        totalSupply[tokenId] = quantity;
        emit CreatorMint(to, tokenId, quantity, tokenUri_);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenUris[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
