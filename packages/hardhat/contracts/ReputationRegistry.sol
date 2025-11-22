// SPDX-License-Identifier: CC0-1.0
pragma solidity >=0.8.0 <0.9.0;

interface IIdentityRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title ReputationRegistry
 * @notice Implementation of the ERC-8004 Reputation Registry.
 */
contract ReputationRegistry {
    address public immutable identityRegistry;

    struct Feedback {
        uint256 agentId;
        address clientAddress;
        uint8 score;
        bytes32 tag1;
        bytes32 tag2;
        string fileuri;
        bytes32 filehash;
        bool isRevoked;
    }

    // agentId => clientAddress => Feedback[]
    mapping(uint256 => mapping(address => Feedback[])) private _feedbacks;
    
    // agentId => clientAddress => lastIndex (count of feedbacks)
    mapping(uint256 => mapping(address => uint64)) private _feedbackCounts;

    event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint8 score, bytes32 indexed tag1, bytes32 tag2, string fileuri, bytes32 filehash);
    event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex);
    event ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseUri);

    constructor(address _identityRegistry) {
        identityRegistry = _identityRegistry;
    }

    function getIdentityRegistry() external view returns (address) {
        return identityRegistry;
    }

    function giveFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata fileuri,
        bytes32 filehash,
        bytes memory feedbackAuth
    ) external {
        require(score <= 100, "Score must be between 0 and 100");
        
        // TODO: Implement full EIP-712/191 signature verification for feedbackAuth.
        // For this implementation, we will assume the caller is authorized if they are the clientAddress
        // or if we implement a simplified check.
        // The spec implies the AGENT authorizes the CLIENT.
        // For simplicity in this MVP+ phase, we will allow anyone to give feedback as themselves (clientAddress = msg.sender).
        // Real implementation would verify the agent signed a permit for msg.sender.
        
        address clientAddress = msg.sender; 

        _feedbacks[agentId][clientAddress].push(Feedback({
            agentId: agentId,
            clientAddress: clientAddress,
            score: score,
            tag1: tag1,
            tag2: tag2,
            fileuri: fileuri,
            filehash: filehash,
            isRevoked: false
        }));

        _feedbackCounts[agentId][clientAddress]++;

        emit NewFeedback(agentId, clientAddress, score, tag1, tag2, fileuri, filehash);
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        require(feedbackIndex < _feedbacks[agentId][msg.sender].length, "Index out of bounds");
        Feedback storage fb = _feedbacks[agentId][msg.sender][feedbackIndex];
        require(!fb.isRevoked, "Already revoked");
        
        fb.isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string calldata responseUri, bytes32 responseHash) external {
        // Anyone can append response? Spec says "Anyone".
        emit ResponseAppended(agentId, clientAddress, feedbackIndex, msg.sender, responseUri);
    }

    function getSummary(uint256 agentId, address[] calldata clientAddresses, bytes32 tag1, bytes32 tag2) external view returns (uint64 count, uint8 averageScore) {
        // Simplified aggregation logic
        uint256 totalScore = 0;
        uint64 totalCount = 0;

        // If clientAddresses is empty, we can't iterate all (too expensive).
        // Spec says "Without filtering by clientAddresses, results are subject to Sybil/spam attacks".
        // It implies we should iterate provided addresses.
        
        for (uint256 i = 0; i < clientAddresses.length; i++) {
            address client = clientAddresses[i];
            uint64 limit = _feedbackCounts[agentId][client];
            for (uint64 j = 0; j < limit; j++) {
                Feedback storage fb = _feedbacks[agentId][client][j];
                if (!fb.isRevoked) {
                    // Filter by tags if provided (non-zero)
                    if ((tag1 == 0 || fb.tag1 == tag1) && (tag2 == 0 || fb.tag2 == tag2)) {
                        totalScore += fb.score;
                        totalCount++;
                    }
                }
            }
        }

        if (totalCount > 0) {
            averageScore = uint8(totalScore / totalCount);
        }
        return (totalCount, averageScore);
    }
}
