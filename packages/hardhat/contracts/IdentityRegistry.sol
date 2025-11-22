// SPDX-License-Identifier: CC0-1.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdentityRegistry
 * @notice Implementation of the ERC-8004 Identity Registry.
 */
contract IdentityRegistry is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    struct MetadataEntry {
        string key;
        bytes value;
    }

    // agentId => key => value
    mapping(uint256 => mapping(string => bytes)) private _agentMetadata;

    event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value);
    event Registered(uint256 indexed agentId, string tokenURI, address indexed owner);

    constructor() ERC721("Agent Identity", "AGENT") Ownable(msg.sender) {}

    function register(string memory tokenURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId) {
        agentId = _register(tokenURI);
        for (uint256 i = 0; i < metadata.length; i++) {
            _setMetadata(agentId, metadata[i].key, metadata[i].value);
        }
    }

    function register(string memory tokenURI) external returns (uint256 agentId) {
        return _register(tokenURI);
    }

    function register() external returns (uint256 agentId) {
        return _register("");
    }

    function _register(string memory tokenURI) internal returns (uint256) {
        uint256 agentId = ++_nextTokenId;
        _mint(msg.sender, agentId);
        _setTokenURI(agentId, tokenURI);
        emit Registered(agentId, tokenURI, msg.sender);
        return agentId;
    }

    function setMetadata(uint256 agentId, string memory key, bytes memory value) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        _setMetadata(agentId, key, value);
    }

    function _setMetadata(uint256 agentId, string memory key, bytes memory value) internal {
        _agentMetadata[agentId][key] = value;
        emit MetadataSet(agentId, key, key, value);
    }

    function getMetadata(uint256 agentId, string memory key) external view returns (bytes memory) {
        return _agentMetadata[agentId][key];
    }
}
