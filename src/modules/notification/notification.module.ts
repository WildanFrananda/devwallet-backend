import { Global, Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import DeviceEntity from "../../domain/entities/device.entity"
import NotificationService from "./notification.service"

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([DeviceEntity])],
  providers: [NotificationService],
  exports: [NotificationService]
})
class NotificationModule {}

export { NotificationModule }
