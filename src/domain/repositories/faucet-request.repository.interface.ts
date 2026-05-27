import FaucetRequestEntity, { type FaucetRequestStatus } from "../entities/faucet-request.entity"

type CreateFaucetRequestInput = {
  device_id: string | null
  chain: string
  address: string
}

type UpdateFaucetRequestInput = {
  status?: FaucetRequestStatus
  tx_hash?: string | null
  amount?: string | null
  error_msg?: string | null
  completed_at?: Date | null
}

abstract class FaucetRequestRepository {
  public abstract create(input: CreateFaucetRequestInput): Promise<FaucetRequestEntity>
  public abstract findById(id: string): Promise<FaucetRequestEntity | null>
  public abstract update(id: string, input: UpdateFaucetRequestInput): Promise<void>
  public abstract listByDevice(deviceId: string, limit: number): Promise<FaucetRequestEntity[]>
}

export default FaucetRequestRepository
export { type CreateFaucetRequestInput, type UpdateFaucetRequestInput }
