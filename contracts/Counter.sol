// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/// A deliberately small contract that still exercises the interesting parts of
/// the SDK: a constructor argument, a view call, a state-changing call, an
/// indexed event, and a revert with a reason string.
contract Counter {
    uint256 private _count;
    address public immutable owner;

    event Incremented(address indexed by, uint256 newValue);

    constructor(uint256 startAt) {
        _count = startAt;
        owner = msg.sender;
    }

    function count() external view returns (uint256) {
        return _count;
    }

    function increment(uint256 by) external returns (uint256) {
        require(by > 0, "increment must be positive");
        _count += by;
        emit Incremented(msg.sender, _count);
        return _count;
    }
}
