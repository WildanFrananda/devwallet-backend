import { Body, Controller, HttpCode, Post } from "@nestjs/common"
import RegisterDeviceDto from "./dto/register-device.dto"
import DeviceService from "./device.service"

@Controller("devices")
class DeviceController {
  public constructor(private readonly devices: DeviceService) {}

  @Post()
  @HttpCode(200)
  public async register(@Body() dto: RegisterDeviceDto): Promise<{
    id: string
    fingerprint: string
    platform: string
    hasPushToken: boolean
  }> {
    const row = await this.devices.upsert({
      fingerprint: dto.fingerprint,
      platform: dto.platform,
      pushToken: dto.pushToken
    })
    return {
      id: row.id,
      fingerprint: row.fingerprint,
      platform: row.platform,
      hasPushToken: row.push_token !== null
    }
  }
}

export default DeviceController
