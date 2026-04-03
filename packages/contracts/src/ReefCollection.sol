// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "solmate/tokens/ERC721.sol";

contract ReefCollection is ERC721 {
    address public owner;
    uint256 public nextTokenId = 1;
    string private _contractMetadataUri;
    mapping(uint256 => string) private _tokenUris;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        address initialOwner_,
        string memory contractMetadataUri_
    ) ERC721(name_, symbol_) {
        owner = initialOwner_;
        _contractMetadataUri = contractMetadataUri_;
        emit OwnershipTransferred(address(0), initialOwner_);
    }

    function contractURI() external view returns (string memory) {
        return _contractMetadataUri;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setContractURI(string calldata contractMetadataUri_) external onlyOwner {
        _contractMetadataUri = contractMetadataUri_;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf[tokenId] != address(0), "NOT_MINTED");
        return _tokenUris[tokenId];
    }

    function mintTo(address to, string calldata tokenUri_) external onlyOwner returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _tokenUris[tokenId] = tokenUri_;
    }
}
