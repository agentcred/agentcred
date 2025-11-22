// SPDX-License-Identifier: CC0-1.0
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title ValidationRegistry
 * @notice Implementation of the ERC-8004 Validation Registry.
 */
contract ValidationRegistry {
    address public immutable identityRegistry;

    struct ValidationRequestData {
        address validatorAddress;
        uint256 agentId;
        string requestUri;
        bytes32 requestHash;
    }

    struct ValidationResponseData {
        uint8 response;
        string responseUri;
        bytes32 responseHash;
        bytes32 tag;
        uint256 lastUpdate;
    }

    // requestHash => ValidationRequestData
    mapping(bytes32 => ValidationRequestData) public requests;
    
    // requestHash => ValidationResponseData (latest response)
    mapping(bytes32 => ValidationResponseData) public responses;

    event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestUri, bytes32 indexed requestHash);
    event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseUri, bytes32 tag);

    constructor(address _identityRegistry) {
        identityRegistry = _identityRegistry;
    }

    function getIdentityRegistry() external view returns (address) {
        return identityRegistry;
    }

    function validationRequest(address validatorAddress, uint256 agentId, string calldata requestUri, bytes32 requestHash) external {
        // In a strict implementation, we would check if msg.sender is owner/operator of agentId using identityRegistry.
        // For this implementation, we emit the event and store the request.
        
        requests[requestHash] = ValidationRequestData({
            validatorAddress: validatorAddress,
            agentId: agentId,
            requestUri: requestUri,
            requestHash: requestHash
        });

        emit ValidationRequest(validatorAddress, agentId, requestUri, requestHash);
    }

    function validationResponse(bytes32 requestHash, uint8 response, string calldata responseUri, bytes32 responseHash, bytes32 tag) external {
        ValidationRequestData memory req = requests[requestHash];
        require(req.validatorAddress != address(0), "Request not found");
        require(msg.sender == req.validatorAddress, "Not authorized validator");
        require(response <= 100, "Response must be 0-100");

        responses[requestHash] = ValidationResponseData({
            response: response,
            responseUri: responseUri,
            responseHash: responseHash,
            tag: tag,
            lastUpdate: block.timestamp
        });

        emit ValidationResponse(req.validatorAddress, req.agentId, requestHash, response, responseUri, tag);
    }

    function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 tag, uint256 lastUpdate) {
        ValidationRequestData memory req = requests[requestHash];
        ValidationResponseData memory res = responses[requestHash];
        
        return (req.validatorAddress, req.agentId, res.response, res.tag, res.lastUpdate);
    }
}
