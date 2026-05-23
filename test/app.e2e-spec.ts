import { Test, TestingModule } from "@nestjs/testing"
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify"
import { AppModule } from "../src/app.module"

describe("Health (e2e)", () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    app.setGlobalPrefix("api/v1")
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  it("GET /api/v1/health returns status payload", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/health" })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ status: string; db: string; redis: string }>()
    expect(body).toHaveProperty("status")
    expect(body).toHaveProperty("db")
    expect(body).toHaveProperty("redis")
  })

  afterAll(async () => {
    await app.close()
  })
})
