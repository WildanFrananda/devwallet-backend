import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import FaucetRequestEntity from "../../../domain/entities/faucet-request.entity"
import FaucetRequestRepository, {
  type CreateFaucetRequestInput,
  type UpdateFaucetRequestInput
} from "../../../domain/repositories/faucet-request.repository.interface"

@Injectable()
class TypeOrmFaucetRequestRepository extends FaucetRequestRepository {
  public constructor(
    @InjectRepository(FaucetRequestEntity)
    private readonly repo: Repository<FaucetRequestEntity>
  ) {
    super()
  }

  public override async create(input: CreateFaucetRequestInput): Promise<FaucetRequestEntity> {
    const entity = this.repo.create({ ...input, status: "pending" })
    return this.repo.save(entity)
  }

  public override findById(id: string): Promise<FaucetRequestEntity | null> {
    return this.repo.findOne({ where: { id } })
  }

  public override async update(id: string, input: UpdateFaucetRequestInput): Promise<void> {
    await this.repo.update({ id }, input)
  }

  public override listByDevice(deviceId: string, limit: number): Promise<FaucetRequestEntity[]> {
    return this.repo.find({
      where: { device_id: deviceId },
      order: { created_at: "DESC" },
      take: limit
    })
  }
}

export default TypeOrmFaucetRequestRepository
