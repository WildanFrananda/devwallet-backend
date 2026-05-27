/**
 * Re-exports the FaucetDispenser ABI as a typed `const` array so viem can
 * type-narrow `writeContract`/`readContract` calls. Source of truth lives
 * in `devwallet-contracts/abi-exports/evm/FaucetDispenser.json` and is
 * mirrored here by `scripts/export-abi.sh` + manual copy.
 */
const FaucetDispenserAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "_dripAmount", type: "uint256", internalType: "uint256" },
      { name: "_cooldown", type: "uint256", internalType: "uint256" }
    ],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "drip",
    inputs: [{ name: "recipient", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "dripAmount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "cooldown",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "lastDripAt",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "nextDripAt",
    inputs: [{ name: "recipient", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "Dripped",
    inputs: [
      { name: "recipient", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "nextAvailableAt", type: "uint256", indexed: false, internalType: "uint256" }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "CooldownActive",
    inputs: [{ name: "nextAvailableAt", type: "uint256", internalType: "uint256" }]
  },
  {
    type: "error",
    name: "FaucetEmpty",
    inputs: [
      { name: "balance", type: "uint256", internalType: "uint256" },
      { name: "required", type: "uint256", internalType: "uint256" }
    ]
  },
  {
    type: "error",
    name: "NotOwner",
    inputs: []
  },
  {
    type: "error",
    name: "ZeroRecipient",
    inputs: []
  },
  {
    type: "error",
    name: "TransferFailed",
    inputs: []
  }
] as const

export { FaucetDispenserAbi }
