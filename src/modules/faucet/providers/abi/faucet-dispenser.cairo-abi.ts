/**
 * Cairo ABI for the Starknet `FaucetDispenser` contract. Source of truth
 * lives in `devwallet-contracts/abi-exports/starknet/FaucetDispenser.json`
 * and is mirrored here (manual copy after running `scripts/export-abi.sh`).
 *
 * Typed as plain `unknown[]` and cast to starknet.js `Abi` at the call
 * site — the JSON structure already matches what starknet.js expects.
 */
const FaucetDispenserCairoAbi = [
  {
    type: "impl",
    name: "FaucetDispenserImpl",
    interface_name: "devwallet_faucet::faucet_dispenser::IFaucetDispenser"
  },
  {
    type: "struct",
    name: "core::integer::u256",
    members: [
      { name: "low", type: "core::integer::u128" },
      { name: "high", type: "core::integer::u128" }
    ]
  },
  {
    type: "interface",
    name: "devwallet_faucet::faucet_dispenser::IFaucetDispenser",
    items: [
      {
        type: "function",
        name: "drip",
        inputs: [
          { name: "recipient", type: "core::starknet::contract_address::ContractAddress" }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "next_drip_at",
        inputs: [
          { name: "recipient", type: "core::starknet::contract_address::ContractAddress" }
        ],
        outputs: [{ type: "core::integer::u64" }],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "drip_amount",
        inputs: [],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "cooldown",
        inputs: [],
        outputs: [{ type: "core::integer::u64" }],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "owner",
        inputs: [],
        outputs: [{ type: "core::starknet::contract_address::ContractAddress" }],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "strk_token",
        inputs: [],
        outputs: [{ type: "core::starknet::contract_address::ContractAddress" }],
        state_mutability: "view"
      }
    ]
  },
  {
    type: "constructor",
    name: "constructor",
    inputs: [
      { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
      { name: "strk_token", type: "core::starknet::contract_address::ContractAddress" },
      { name: "drip_amount", type: "core::integer::u256" },
      { name: "cooldown_seconds", type: "core::integer::u64" }
    ]
  },
  {
    type: "event",
    name: "devwallet_faucet::faucet_dispenser::FaucetDispenser::Dripped",
    kind: "struct",
    members: [
      { name: "recipient", type: "core::starknet::contract_address::ContractAddress", kind: "key" },
      { name: "amount", type: "core::integer::u256", kind: "data" },
      { name: "next_available_at", type: "core::integer::u64", kind: "data" }
    ]
  }
] as const

export { FaucetDispenserCairoAbi }
