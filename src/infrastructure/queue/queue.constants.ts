export const QueueNames = {
  Faucet: "faucet"
} as const

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames]
