// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IAgentStaking {
    function getStake(uint256 agentId) external view returns (uint256);
    function slash(uint256 agentId, uint256 amount, string memory reason) external;
}

/**
 * @title ContentRegistry
 * @notice Anchors the public history of audited content on-chain.
 */
contract ContentRegistry is AccessControl {
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    
    // Slashing formula constants
    uint8 public constant PASS_THRESHOLD = 51;        // Score >= 51 = no slash
    uint8 public constant MILD_FAIL_THRESHOLD = 21;   // Score 21-50 = 5% slash
    uint8 public constant BAD_FAIL_THRESHOLD = 1;     // Score 1-20 = 15% slash
    // Score 0 = 30% slash (critical)
    
    uint16 public constant MILD_FAIL_BPS = 500;       // 5%
    uint16 public constant BAD_FAIL_BPS = 1500;       // 15%
    uint16 public constant CRITICAL_FAIL_BPS = 3000;  // 30%
    uint16 public constant BPS_DENOMINATOR = 10000;   // 100%
    
    // Reference to AgentStaking contract
    IAgentStaking public agentStaking;

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
    event AgentStakingUpdated(address indexed newAgentStaking);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Sets the AgentStaking contract address.
     * @dev Only callable by admin.
     * @param _agentStaking The address of the AgentStaking contract.
     */
    function setAgentStaking(address _agentStaking) external onlyRole(DEFAULT_ADMIN_ROLE) {
        agentStaking = IAgentStaking(_agentStaking);
        emit AgentStakingUpdated(_agentStaking);
    }

    /**
     * @notice Publishes new content to the registry.
     * @param _contentHash The unique hash of the content.
     * @param _author The address of the content author (user submitting through agent).
     * @param _agentId The ID of the AI agent that generated the content.
     * @param _uri The location where the full content is stored.
     */
    function publishContent(string memory _contentHash, address _author, uint256 _agentId, string memory _uri) external {
        require(contents[_contentHash].timestamp == 0, "Content already exists");

        contents[_contentHash] = Content({
            contentHash: _contentHash,
            author: _author,
            agentId: _agentId,
            status: Status.Pending,
            auditScore: 0,
            uri: _uri,
            timestamp: block.timestamp
        });

        emit ContentPublished(_contentHash, _author, _agentId, _uri);
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

        // If audit failed and AgentStaking is set, calculate and apply slash
        if (!_ok && address(agentStaking) != address(0)) {
            _handleSlashing(content.agentId, uint8(_score));
        }

        emit ContentAudited(_contentHash, _ok, _score);
    }

    /**
     * @notice Calculates and applies slashing based on audit score.
     * @dev Internal function called when audit fails.
     * @param _agentId The ID of the agent to slash.
     * @param _score The audit score (0-100).
     */
    function _handleSlashing(uint256 _agentId, uint8 _score) internal {
        uint256 stake = agentStaking.getStake(_agentId);
        if (stake == 0) return;

        uint16 bps; // basis points, out of BPS_DENOMINATOR

        if (_score >= PASS_THRESHOLD) {
            return; // no slash for passing scores
        } else if (_score >= MILD_FAIL_THRESHOLD) {
            bps = MILD_FAIL_BPS;    // 5% for mild fail
        } else if (_score >= BAD_FAIL_THRESHOLD) {
            bps = BAD_FAIL_BPS;     // 15% for bad fail
        } else {
            bps = CRITICAL_FAIL_BPS; // 30% for critical failure
        }

        uint256 amount = stake * bps / BPS_DENOMINATOR;
        if (amount > 0) {
            string memory reason = string(abi.encodePacked("Audit failed with score: ", _uint2str(_score)));
            agentStaking.slash(_agentId, amount, reason);
        }
    }

    /**
     * @notice Helper function to convert uint to string.
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
