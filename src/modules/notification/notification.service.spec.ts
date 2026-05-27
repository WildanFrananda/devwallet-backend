import { Test } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"
import { getRepositoryToken } from "@nestjs/typeorm"
import NotificationService from "./notification.service"
import DeviceEntity from "../../domain/entities/device.entity"

const mockSendEach = jest.fn()
const mockMessaging = jest.fn(() => ({ sendEachForMulticast: mockSendEach }))

jest.mock("firebase-admin", () => ({
  apps: [],
  credential: { cert: jest.fn(() => ({})) },
  initializeApp: jest.fn(),
  messaging: () => mockMessaging()
}))

jest.mock("fs", () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn()
}))

describe("NotificationService", () => {
  let service: NotificationService
  let devices: { find: jest.Mock; update: jest.Mock }
  let config: { get: jest.Mock }

  beforeEach(async () => {
    mockSendEach.mockReset()
    devices = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 0 })
    }
    config = { get: jest.fn().mockReturnValue("") }

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: ConfigService, useValue: config },
        { provide: getRepositoryToken(DeviceEntity), useValue: devices }
      ]
    }).compile()
    service = moduleRef.get(NotificationService)
  })

  it("init: no project id → logs warning, messaging stays null", () => {
    service.onModuleInit()
    expect(mockMessaging).not.toHaveBeenCalled()
  })

  it("sendByFingerprint: no tokens → no-op", async () => {
    service.onModuleInit()
    await service.sendByFingerprint("fp-x", { title: "t", body: "b", data: {} })
    expect(devices.find).toHaveBeenCalledWith({ where: { fingerprint: "fp-x" } })
    expect(mockSendEach).not.toHaveBeenCalled()
  })

  it("sendByFingerprint: tokens present + push disabled → logs + skips", async () => {
    devices.find.mockResolvedValue([
      { push_token: "tok-1" },
      { push_token: "tok-2" }
    ])
    service.onModuleInit()
    await service.sendByFingerprint("fp-y", { title: "t", body: "b", data: {} })
    expect(mockSendEach).not.toHaveBeenCalled()
  })

  it("sendToTokens: invokes messaging when configured", async () => {
    config.get.mockImplementation((key: string) => {
      if (key === "FIREBASE_PROJECT_ID") return "test-project"
      if (key === "FIREBASE_ADMIN_KEY_PATH") return "/tmp/fake-key.json"
      return ""
    })
    const fs = jest.requireMock<{ existsSync: jest.Mock; readFileSync: jest.Mock }>("fs")
    fs.existsSync.mockReturnValue(true)
    fs.readFileSync.mockReturnValue(JSON.stringify({ project_id: "test-project" }))

    mockSendEach.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      responses: [{ success: true }, { success: true }]
    })

    service.onModuleInit()
    await service.sendToTokens(["tok-1", "tok-2"], { title: "t", body: "b", data: { k: "v" } })
    expect(mockSendEach).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["tok-1", "tok-2"],
        notification: { title: "t", body: "b" },
        data: { k: "v" }
      })
    )
  })

  it("sendToTokens: prunes dead tokens reported by FCM", async () => {
    config.get.mockImplementation((key: string) => {
      if (key === "FIREBASE_PROJECT_ID") return "test-project"
      if (key === "FIREBASE_ADMIN_KEY_PATH") return "/tmp/fake-key.json"
      return ""
    })
    const fs = jest.requireMock<{ existsSync: jest.Mock; readFileSync: jest.Mock }>("fs")
    fs.existsSync.mockReturnValue(true)
    fs.readFileSync.mockReturnValue(JSON.stringify({ project_id: "test-project" }))

    mockSendEach.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        { success: false, error: { code: "messaging/registration-token-not-registered" } }
      ]
    })

    service.onModuleInit()
    await service.sendToTokens(["good", "dead"], { title: "t", body: "b", data: {} })
    expect(devices.update).toHaveBeenCalledWith(
      expect.objectContaining({ push_token: expect.anything() }),
      { push_token: null }
    )
  })
})
