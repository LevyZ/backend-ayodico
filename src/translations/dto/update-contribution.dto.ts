import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { TranslationDirection } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateContributionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trim)
  frenchTerm?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trim)
  bheteTerm?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(trim)
  toneNotation?: string;

  @IsOptional()
  @IsEnum(TranslationDirection)
  direction?: TranslationDirection;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trim)
  contextOrMeaning?: string;

  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsString()
  cantonId?: string;
}
