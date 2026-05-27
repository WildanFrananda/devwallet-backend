import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator"

class RegisterDeviceDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  public fingerprint!: string

  @IsIn(["ios", "android"])
  public platform!: "ios" | "android"

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  public pushToken?: string
}

export default RegisterDeviceDto
