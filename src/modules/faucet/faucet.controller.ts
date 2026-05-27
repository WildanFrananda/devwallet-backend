import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards
} from "@nestjs/common"
import FaucetService from "./faucet.service"
import RequestFaucetDto from "./dto/request-faucet.dto"
import FaucetRateLimitGuard from "./guards/rate-limit.guard"

@Controller("faucet")
class FaucetController {
  public constructor(private readonly faucet: FaucetService) {}

  @Post("request")
  @HttpCode(202)
  @UseGuards(FaucetRateLimitGuard)
  public async request(
    @Body() dto: RequestFaucetDto
  ): Promise<{ jobs: ReadonlyArray<{ chain: string; requestId: string; jobId: string }> }> {
    return this.faucet.enqueueBatch({
      addresses: dto.addresses,
      deviceId: null,
      deviceFingerprint: dto.deviceFingerprint
    })
  }

  @Get("status/:id")
  public async status(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<{
    id: string
    chain: string
    address: string
    status: string
    tx_hash: string | null
    amount: string | null
    error_msg: string | null
    manual_url: string | null
    completed_at: Date | null
  }> {
    const row = await this.faucet.findRequest(id)
    if (!row) throw new NotFoundException(`Faucet request ${id} not found`)
    return {
      id: row.id,
      chain: row.chain,
      address: row.address,
      status: row.status,
      tx_hash: row.tx_hash,
      amount: row.amount,
      error_msg: row.error_msg,
      manual_url: row.manual_url,
      completed_at: row.completed_at
    }
  }

  @Get("history")
  public async history(
    @Query("deviceId", new ParseUUIDPipe({ version: "4" })) deviceId: string,
    @Query("limit") limit: string = "50"
  ): Promise<Array<{ id: string; chain: string; status: string; tx_hash: string | null; created_at: Date }>> {
    const rows = await this.faucet.historyForDevice(deviceId, Math.min(parseInt(limit, 10) || 50, 100))
    return rows.map(r => ({
      id: r.id,
      chain: r.chain,
      status: r.status,
      tx_hash: r.tx_hash,
      created_at: r.created_at
    }))
  }
}

export default FaucetController
