const QueueNames = {
  Faucet: "faucet"
} as const

type QueueName = (typeof QueueNames)[keyof typeof QueueNames]

export { QueueNames, type QueueName }
