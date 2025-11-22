// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TrustScoreRegistry
 * @notice Maintains reputation scores for users and agents.
 */
contract TrustScoreRegistry is AccessControl {
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // Mapping from user address to reputation score
    mapping(address => int256) public userReputation;
    // Mapping from agentId to reputation score
    mapping(uint256 => int256) public agentReputation;

    event UserReputationUpdated(address indexed user, int256 newScore, int256 delta);
    event AgentReputationUpdated(uint256 indexed agentId, int256 newScore, int256 delta);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Adjusts the reputation score of a user.
     * @dev Only callable by accounts with AUDITOR_ROLE.
     * @param _user The address of the user.
     * @param _delta The change in reputation score (positive or negative).
     */
    function adjustUserReputation(address _user, int256 _delta) external onlyRole(AUDITOR_ROLE) {
        userReputation[_user] += _delta;
        emit UserReputationUpdated(_user, userReputation[_user], _delta);
    }

    /**
     * @notice Adjusts the reputation score of an agent.
     * @dev Only callable by accounts with AUDITOR_ROLE.
     * @param _agentId The ID of the agent.
     * @param _delta The change in reputation score (positive or negative).
     */
    function adjustAgentReputation(uint256 _agentId, int256 _delta) external onlyRole(AUDITOR_ROLE) {
        agentReputation[_agentId] += _delta;
        emit AgentReputationUpdated(_agentId, agentReputation[_agentId], _delta);
    }
}
