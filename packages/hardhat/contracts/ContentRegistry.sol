// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ContentRegistry
 * @notice Anchors the public history of audited content on-chain.
 */
contract ContentRegistry is AccessControl {
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    enum Status {
        Pending,
        Published,
        AuditedOk,
        AuditedFail
    }

    struct Content {
        string contentHash;
        address author;
        uint256 agentId;
        Status status;
        uint256 auditScore;
        string uri;
        uint256 timestamp;
    }

    // Mapping from contentHash to Content details
    mapping(string => Content) public contents;

    event ContentPublished(string indexed contentHash, address indexed author, uint256 indexed agentId, string uri);
    event ContentAudited(string indexed contentHash, bool ok, uint256 score);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Publishes new content to the registry.
     * @param _contentHash The unique hash of the content.
     * @param _agentId The ID of the AI agent that generated the content.
     * @param _uri The location where the full content is stored.
     */
    function publishContent(string memory _contentHash, uint256 _agentId, string memory _uri) external {
        require(contents[_contentHash].timestamp == 0, "Content already exists");

        contents[_contentHash] = Content({
            contentHash: _contentHash,
            author: msg.sender,
            agentId: _agentId,
            status: Status.Pending,
            auditScore: 0,
            uri: _uri,
            timestamp: block.timestamp
        });

        emit ContentPublished(_contentHash, msg.sender, _agentId, _uri);
    }

    /**
     * @notice Updates the audit result for a specific content.
     * @dev Only callable by accounts with AUDITOR_ROLE.
     * @param _contentHash The unique hash of the content.
     * @param _ok Whether the audit passed or failed.
     * @param _score The numerical score (0-100).
     */
    function updateAuditResult(string memory _contentHash, bool _ok, uint256 _score) external onlyRole(AUDITOR_ROLE) {
        require(contents[_contentHash].timestamp != 0, "Content does not exist");
        require(_score <= 100, "Score must be between 0 and 100");

        Content storage content = contents[_contentHash];
        content.status = _ok ? Status.AuditedOk : Status.AuditedFail;
        content.auditScore = _score;

        emit ContentAudited(_contentHash, _ok, _score);
    }
}
