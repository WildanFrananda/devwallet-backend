import { Test } from "@nestjs/testing"
import { getQueueToken } from "@nestjs/bullmq"
import FaucetService from "./faucet.service"
import FaucetRequestRepository from "../../domain/repositories/faucet-request.repository.interface"
import { QueueNames } from "../../infrastructure/queue/queue.constants"
import type FaucetRequestEntity from "../../domain/entities/faucet-request.entity"

const FAKE_ROW: FaucetRequestEntity = {
  id: "11111111-1111-1111-1111-111111111111",
  device_id: null,
  device: null,
  chain: "evm:sepolia",
  address: "0xabc",
  status: "pending",
  tx_hash: null,
  amount: null,
  error_msg: null,
  manual_url: null,
  created_at: new Date(),
  completed_at: null
}

describe("FaucetService", () => {
  let service: FaucetService
  let queueAdd: jest.Mock
  let repoCreate: jest.Mock
  let repoFindById: jest.Mock
  let repoListByDevice: jest.Mock

  beforeEach(async () => {
    queueAdd = jest.fn().mockResolvedValue({ id: "job-xyz" })
    repoCreate = jest.fn().mockImplementation((input: { chain: string; address: string }) =>
      Promise.resolve({ ...FAKE_ROW, chain: input.chain, address: input.address })
    )
    repoFindById = jest.fn().mockResolvedValue(FAKE_ROW)
    repoListByDevice = jest.fn().mockResolvedValue([FAKE_ROW])

    const moduleRef = await Test.createTestingModule({
      providers: [
        FaucetService,
        {
          provide: getQueueToken(QueueNames.Faucet),
          useValue: { add: queueAdd }
        },
        {
          provide: FaucetRequestRepository,
          useValue: { create: repoCreate, findById: repoFindById, listByDevice: repoListByDevice }
        }
      ]
    }).compile()

    service = moduleRef.get(FaucetService)
  })

  describe("enqueueBatch", () => {
    it("creates one DB row + one job per supported chain", async () => {
      const result = await service.enqueueBatch({
        addresses: { "evm:sepolia": "0xa", "xrpl:testnet": "rABC" },
        deviceId: null,
        deviceFingerprint: "fp-001"
      })
      expect(repoCreate).toHaveBeenCalledTimes(2)
      expect(queueAdd).toHaveBeenCalledTimes(2)
      expect(result.jobs).toHaveLength(2)
    })

    it("skips unsupported chain keys silently", async () => {
      const result = await service.enqueueBatch({
        addresses: { "evm:sepolia": "0xa", "evm:mainnet": "0xb" },
        deviceId: null,
        deviceFingerprint: "fp-002"
      })
      expect(repoCreate).toHaveBeenCalledTimes(1)
      expect(result.jobs).toHaveLength(1)
    })

    it("passes fingerprint into job data", async () => {
      await service.enqueueBatch({
        addresses: { "evm:sepolia": "0xa" },
        deviceId: "dev-id-1",
        deviceFingerprint: "fp-prop"
      })
      expect(queueAdd).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ deviceFingerprint: "fp-prop", deviceId: "dev-id-1" }),
        expect.objectContaining({ jobId: expect.any(String) as string })
      )
    })
  })

  describe("findRequest", () => {
    it("delegates to repository.findById", async () => {
      const row = await service.findRequest("any-id")
      expect(repoFindById).toHaveBeenCalledWith("any-id")
      expect(row).toBe(FAKE_ROW)
    })
  })

  describe("historyForDevice", () => {
    it("delegates to repository.listByDevice with default limit", async () => {
      await service.historyForDevice("device-uuid")
      expect(repoListByDevice).toHaveBeenCalledWith("device-uuid", 50)
    })

    it("respects custom limit", async () => {
      await service.historyForDevice("device-uuid", 10)
      expect(repoListByDevice).toHaveBeenCalledWith("device-uuid", 10)
    })
  })
})
