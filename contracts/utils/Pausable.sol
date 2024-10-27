// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract Pausable {
    /**
     * @dev maps token id to if its paused
     */
    mapping(uint256 => bool) private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account, uint256 id);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account, uint256 id);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Initializes the contract in unpaused state.
     */
    constructor() { }

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused(uint256 _id) {
        _requireNotPaused(_id);
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused(uint256 _id) {
        _requirePaused(_id);
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused(uint256 _id) public view virtual returns (bool) {
        return _paused[_id];
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused(uint256 _id) internal view virtual {
        if (paused(_id)) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused(uint256 _id) internal view virtual {
        if (!paused(_id)) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause(uint256 _id) public whenNotPaused(_id) {
        _paused[_id] = true;
        emit Paused(msg.sender, _id);
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause(uint256 _id) internal virtual whenPaused(_id) {
        _paused[_id] = false;
        emit Unpaused(msg.sender, _id);
    }
}
