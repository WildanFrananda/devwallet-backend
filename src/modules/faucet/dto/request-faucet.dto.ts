import { IsObject, IsString, MaxLength, MinLength, Validate, ValidatorConstraint } from "class-validator"
import type { ValidatorConstraintInterface } from "class-validator"
import { isSupportedChain, SUPPORTED_CHAINS } from "../chains"

@ValidatorConstraint({ name: "supportedChainKeys", async: false })
class SupportedChainKeysConstraint implements ValidatorConstraintInterface {
  public validate(value: unknown): boolean {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false
    const keys = Object.keys(value)
    if (keys.length === 0) return false
    return keys.every(isSupportedChain)
  }

  public defaultMessage(): string {
    return `addresses must be a non-empty map keyed by supported chains: ${SUPPORTED_CHAINS.join(", ")}`
  }
}

class RequestFaucetDto {
  @IsObject()
  @Validate(SupportedChainKeysConstraint)
  public addresses!: Record<string, string>

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  public deviceFingerprint!: string
}

export default RequestFaucetDto
