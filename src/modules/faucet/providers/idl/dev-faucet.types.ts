/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/dev_faucet.json`.
 */
export type DevFaucet = {
  "address": "2UhnWRa3Pu4BqTN7xnZG9jxkmz3cgCEC2AF2Jh5MKgCY",
  "metadata": {
    "name": "devFaucet",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "DevWallet faucet program (testnet)"
  },
  "instructions": [
    {
      "name": "drip",
      "discriminator": [
        215,
        250,
        141,
        179,
        116,
        10,
        187,
        192
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "faucet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  117,
                  99,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "faucet.authority",
                "account": "faucetState"
              }
            ]
          }
        },
        {
          "name": "recipientRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  105,
                  112,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "faucet"
              },
              {
                "kind": "arg",
                "path": "recipient"
              }
            ]
          }
        },
        {
          "name": "recipientAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "recipient",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "fund",
      "discriminator": [
        218,
        188,
        111,
        221,
        152,
        113,
        174,
        7
      ],
      "accounts": [
        {
          "name": "funder",
          "writable": true,
          "signer": true
        },
        {
          "name": "faucet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  117,
                  99,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "faucet.authority",
                "account": "faucetState"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "faucet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  117,
                  99,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "dripAmount",
          "type": "u64"
        },
        {
          "name": "cooldownSeconds",
          "type": "i64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "faucetState",
      "discriminator": [
        241,
        183,
        103,
        67,
        44,
        12,
        178,
        23
      ]
    },
    {
      "name": "recipientRecord",
      "discriminator": [
        138,
        59,
        120,
        98,
        195,
        27,
        223,
        111
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "cooldownActive",
      "msg": "Cooldown still active for this recipient"
    },
    {
      "code": 6001,
      "name": "faucetEmpty",
      "msg": "Faucet PDA does not hold enough lamports for a drip"
    },
    {
      "code": 6002,
      "name": "notAuthority",
      "msg": "Signer is not the configured faucet authority"
    }
  ],
  "types": [
    {
      "name": "faucetState",
      "docs": [
        "Global faucet config + native SOL vault. Stored at PDA derived from",
        "(FAUCET_SEED, authority). The account itself holds the SOL that `drip`",
        "transfers to recipients."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "dripAmount",
            "type": "u64"
          },
          {
            "name": "cooldownSeconds",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "recipientRecord",
      "docs": [
        "Per-recipient cooldown tracker. Stored at PDA",
        "(RECIPIENT_SEED, faucet, recipient)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "lastDripAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "faucetSeed",
      "type": "bytes",
      "value": "[102, 97, 117, 99, 101, 116]"
    },
    {
      "name": "recipientSeed",
      "type": "bytes",
      "value": "[114, 101, 99, 105, 112, 105, 101, 110, 116]"
    }
  ]
};
