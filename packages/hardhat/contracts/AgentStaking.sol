// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AgentStaking
 * @notice Manages staking and slashing for AI agents.
 */
contract AgentStaking is AccessControl {
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    IERC20 public stakingToken;

    // Mapping from agentId to staked amount
    mapping(uint256 => uint256) public stakes;
    // Mapping from agentId to owner address (assuming one owner per agent for simplicity)
    mapping(uint256 => address) public agentOwners;

    // ERC-8004 Identity Registry Address
    address public identityRegistry;

    event Staked(uint256 indexed agentId, address indexed staker, uint256 amount);
    event Unstaked(uint256 indexed agentId, address indexed staker, uint256 amount);
    event Slashed(uint256 indexed agentId, uint256 amount, string reason);
    event IdentityRegistryUpdated(address indexed newRegistry);

    constructor(address _stakingToken) {
        stakingToken = IERC20(_stakingToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Stakes tokens for a specific agent.
     * @param _agentId The ID of the agent to stake for.
     * @param _amount The amount of tokens to stake.
     */
    function stake(uint256 _agentId, uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");

        // Verify agent existence if registry is set
        if (identityRegistry != address(0)) {
            try IERC721(identityRegistry).ownerOf(_agentId) returns (address) {
                // Agent exists
            } catch {
                revert("Agent not registered");
            }
        }
        
        // If it's the first stake for this agent, set the owner
        if (stakes[_agentId] == 0) {
            agentOwners[_agentId] = msg.sender;
        } else {
            require(agentOwners[_agentId] == msg.sender, "Only the agent owner can stake");
        }

        stakes[_agentId] += _amount;
        require(stakingToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        emit Staked(_agentId, msg.sender, _amount);
    }

    /**
     * @notice Unstakes tokens for a specific agent.
     * @param _agentId The ID of the agent to unstake from.
     * @param _amount The amount of tokens to unstake.
     */
    function unstake(uint256 _agentId, uint256 _amount) external {
        require(agentOwners[_agentId] == msg.sender, "Only the agent owner can unstake");
        require(stakes[_agentId] >= _amount, "Insufficient stake");

        stakes[_agentId] -= _amount;
        require(stakingToken.transfer(msg.sender, _amount), "Transfer failed");

        emit Unstaked(_agentId, msg.sender, _amount);
    }

    /**
     * @notice Slashes an agent's stake.
     * @dev Only callable by accounts with AUDITOR_ROLE.
     * @param _agentId The ID of the agent to slash.
     * @param _amount The amount of tokens to slash.
     * @param _reason The reason for slashing.
     */
    function slash(uint256 _agentId, uint256 _amount, string memory _reason) external onlyRole(AUDITOR_ROLE) {
        require(stakes[_agentId] >= _amount, "Insufficient stake to slash");

        stakes[_agentId] -= _amount;
        // In a real scenario, slashed tokens might be burned or sent to a treasury.
        // For now, we'll just keep them in the contract (effectively confiscated).
        
        emit Slashed(_agentId, _amount, _reason);
    }

    /**
     * @notice Sets the ERC-8004 Identity Registry address.
     * @dev Only callable by the admin.
     * @param _identityRegistry The address of the Identity Registry.
     */
    function setIdentityRegistry(address _identityRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        identityRegistry = _identityRegistry;
        emit IdentityRegistryUpdated(_identityRegistry);
    }
}
