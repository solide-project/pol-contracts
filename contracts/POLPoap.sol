// SPDX-License-Identifier: MIT
pragma solidity >=0.8.25;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import "./utils/Pausable.sol";

contract POLPoap is
    ERC1155,
    Ownable,
    AccessControl,
    ERC1155Burnable,
    ERC1155Supply,
    Pausable
{
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC1155("POL POAP") Ownable(msg.sender) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    mapping(address => uint256[]) private ownedTokenIds;

    function mint(
        address account,
        uint256 id,
        bytes memory data,
        string memory verification,
        bytes memory signature
    ) public hasPoap(id, account) whenNotPaused(id) {
        require(
            validateSignature(account, id, signature),
            "Unauthorized signature"
        );

        mintTracker[account][id] = block.timestamp;
        ownedTokenIds[account].push(id);
        verifications[account][id] = verification;
        _mint(account, id, 1, data);
    }

    function getOwnedTokenIds(address account)
        external
        view
        returns (uint256[] memory)
    {
        return ownedTokenIds[account];
    }

    // ********** Contract URI ********** //
    string private _contractURI;

    function contractURI() external view returns (string memory) {
        return _contractURI;
    }

    function setContractURI(string memory newURI) external onlyOwner {
        _contractURI = newURI;
    }

    // ********** Token URI ********** //
    mapping(uint256 => string) _tokenURIs;

    function uri(uint256 id) public view override returns (string memory) {
        return _tokenURIs[id];
    }

    function setURI(uint256 id, string memory newURI) external onlyOwner {
        _tokenURIs[id] = newURI;
    }

    // ********** Token Tracker ********** //
    mapping(address => mapping(uint256 => uint256)) public mintTracker;

    /**
     * @dev Check if poap is minted for an account.
     * Minted poaps will have their timestamp recorded
     */
    modifier hasPoap(uint256 _id, address _account) {
        require(mintTracker[_account][_id] == 0, "Poap minted");
        _;
    }

    // ********** IPFS Verification  ********** //
    mapping(address => mapping(uint256 => string)) private verifications;

    function setVerification(
        address account,
        uint256 id,
        string memory verification
    ) public onlyOwner {
        verifications[account][id] = verification;
    }

    function getVerification(
        address account,
        uint256 id
    ) public view returns(string memory) {
        return verifications[account][id];
    }

    // ********** Pausible Token ********** //
    function pause(uint256 _id) external onlyOwner {
        _pause(_id);
    }

    function unpause(uint256 _id) external onlyOwner {
        _unpause(_id);
    }

    // ********** Utility ********** //
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function validateSignature(
        address _recipient,
        uint256 _id,
        bytes memory _signature
    ) private view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(_recipient, _id));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(_signature);

        return hasRole(MINTER_ROLE, signer);
    }
}
