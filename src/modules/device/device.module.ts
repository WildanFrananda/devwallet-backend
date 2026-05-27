import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import DeviceEntity from "../../domain/entities/device.entity"
import DeviceController from "./device.controller"
import DeviceService from "./device.service"

@Module({
  imports: [TypeOrmModule.forFeature([DeviceEntity])],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService]
})
class DeviceModule {}

export { DeviceModule }
