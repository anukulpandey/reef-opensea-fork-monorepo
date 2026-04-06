// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {SeaDrop} from "seadrop/SeaDrop.sol";

contract SeaDropReference {
    function seaDropCreationCode() external pure returns (bytes memory) {
        return type(SeaDrop).creationCode;
    }
}
