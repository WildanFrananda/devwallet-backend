import { Test } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import DeviceService from "./device.service"
import DeviceEntity from "../../domain/entities/device.entity"

describe("DeviceService", () => {
  let service: DeviceService
  let repo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock }

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn((input: Record<string, unknown>) => Promise.resolve({ id: "dev-uuid", ...input })),
      create: jest.fn((input: Record<string, unknown>) => input)
    }
    const moduleRef = await Test.createTestingModule({
      providers: [
        DeviceService,
        { provide: getRepositoryToken(DeviceEntity), useValue: repo }
      ]
    }).compile()
    service = moduleRef.get(DeviceService)
  })

  it("creates new device when fingerprint not found", async () => {
    repo.findOne.mockResolvedValue(null)
    const row = await service.upsert({
      fingerprint: "fp-new",
      platform: "android",
      pushToken: "tok-1"
    })
    expect(repo.create).toHaveBeenCalledWith({
      fingerprint: "fp-new",
      platform: "android",
      push_token: "tok-1"
    })
    expect(repo.save).toHaveBeenCalled()
    expect(row.id).toBe("dev-uuid")
  })

  it("updates platform + token when fingerprint already exists", async () => {
    repo.findOne.mockResolvedValue({
      id: "existing-id",
      fingerprint: "fp-existing",
      platform: "ios",
      push_token: "old-token"
    })
    await service.upsert({
      fingerprint: "fp-existing",
      platform: "android",
      pushToken: "new-token"
    })
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "existing-id",
        platform: "android",
        push_token: "new-token"
      })
    )
    expect(repo.create).not.toHaveBeenCalled()
  })

  it("keeps existing push_token when caller omits it", async () => {
    repo.findOne.mockResolvedValue({
      id: "existing-id",
      fingerprint: "fp-keep",
      platform: "android",
      push_token: "keep-me"
    })
    await service.upsert({ fingerprint: "fp-keep", platform: "android" })
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ push_token: "keep-me" })
    )
  })

  it("creates with null push_token when missing", async () => {
    repo.findOne.mockResolvedValue(null)
    await service.upsert({ fingerprint: "fp-nope", platform: "ios" })
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ push_token: null })
    )
  })
})
