// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

/**
 * @title TwoStepOwnable
 * @notice Minimal non-upgradeable counterpart to Limit Break's two-step ownership contract.
 *         SeaDrop's ERC721 token contracts depend on this interface and behavior.
 */
abstract contract TwoStepOwnable {
    address private _owner;
    address private _potentialOwner;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    event PotentialOwnerUpdated(address newPotentialAdministrator);

    error NewOwnerIsZeroAddress();
    error NotNextOwner();
    error OnlyOwner();

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    constructor() {
        _transferOwnership(msg.sender);
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function potentialOwner() public view virtual returns (address) {
        return _potentialOwner;
    }

    function transferOwnership(
        address newPotentialOwner
    ) public virtual onlyOwner {
        if (newPotentialOwner == address(0)) {
            revert NewOwnerIsZeroAddress();
        }
        _potentialOwner = newPotentialOwner;
        emit PotentialOwnerUpdated(newPotentialOwner);
    }

    function acceptOwnership() public virtual {
        address nextOwner = _potentialOwner;
        if (msg.sender != nextOwner) {
            revert NotNextOwner();
        }
        delete _potentialOwner;
        emit PotentialOwnerUpdated(address(0));
        _transferOwnership(nextOwner);
    }

    function cancelOwnershipTransfer() public virtual onlyOwner {
        delete _potentialOwner;
        emit PotentialOwnerUpdated(address(0));
    }

    function renounceOwnership() public virtual onlyOwner {
        delete _potentialOwner;
        emit PotentialOwnerUpdated(address(0));
        _transferOwnership(address(0));
    }

    function _checkOwner() internal view virtual {
        if (_owner != msg.sender) {
            revert OnlyOwner();
        }
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
