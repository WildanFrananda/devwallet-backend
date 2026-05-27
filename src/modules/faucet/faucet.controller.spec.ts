import { Test } from "@nestjs/testing"
import { NotFoundException } from "@nestjs/common"
import FaucetController from "./faucet.controller"
import FaucetService from "./faucet.service"
import FaucetRateLimitGuard from "./guards/rate-limit.guard"
import type FaucetRequestEntity from "../../domain/entities/faucet-request.entity"

const ROW: FaucetRequestEntity = {
  id: "11111111-1111-1111-1111-111111111111",
  device_id: null,
  device: null,
  chain: "evm:sepolia",
  address: "0xabc",
  status: "completed",
  tx_hash: "0xtx",
  amount: "0.005",
  error_msg: null,
  manual_url: null,
  created_at: new Date(),
  completed_at: new Date()
}

describe("FaucetController", () => {
  let controller: FaucetController
  let service: { enqueueBatch: jest.Mock; findRequest: jest.Mock; historyForDevice: jest.Mock }

  beforeEach(async () => {
    service = {
      enqueueBatch: jest.fn().mockResolvedValue({ jobs: [{ chain: "evm:sepolia", requestId: "r", jobId: "j" }] }),
      findRequest: jest.fn(),
      historyForDevice: jest.fn().mockResolvedValue([ROW])
    }
    const moduleRef = await Test.createTestingModule({
      controllers: [FaucetController],
      providers: [{ provide: FaucetService, useValue: service }]
    })
      .overrideGuard(FaucetRateLimitGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile()
    controller = moduleRef.get(FaucetController)
  })

  it("POST /request returns job array", async () => {
    const result = await controller.request({
      addresses: { "evm:sepolia": "0xabc" },
      deviceFingerprint: "fp-controller-test"
    })
    expect(result.jobs).toHaveLength(1)
    expect(service.enqueueBatch).toHaveBeenCalledWith({
      addresses: { "evm:sepolia": "0xabc" },
      deviceId: null,
      deviceFingerprint: "fp-controller-test"
    })
  })

  it("GET /status/:id returns mapped row", async () => {
    service.findRequest.mockResolvedValue(ROW)
    const result = await controller.status(ROW.id)
    expect(result).toMatchObject({
      id: ROW.id,
      chain: "evm:sepolia",
      status: "completed",
      tx_hash: "0xtx",
      amount: "0.005",
      manual_url: null
    })
  })

  it("GET /status/:id throws 404 when not found", async () => {
    service.findRequest.mockResolvedValue(null)
    await expect(controller.status("22222222-2222-2222-2222-222222222222")).rejects.toBeInstanceOf(NotFoundException)
  })

  it("GET /history clamps limit to 100", async () => {
    await controller.history("33333333-3333-3333-3333-333333333333", "500")
    expect(service.historyForDevice).toHaveBeenCalledWith("33333333-3333-3333-3333-333333333333", 100)
  })

  it("GET /history defaults limit to 50 when omitted", async () => {
    await controller.history("33333333-3333-3333-3333-333333333333")
    expect(service.historyForDevice).toHaveBeenCalledWith("33333333-3333-3333-3333-333333333333", 50)
  })
})
