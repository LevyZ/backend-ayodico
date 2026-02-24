import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @ValidateIf((o) => o.preferredRegionId !== null)
  @IsUUID()
  preferredRegionId?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.preferredCantonId !== null)
  @IsUUID()
  preferredCantonId?: string | null;
}
