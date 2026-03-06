import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TranslationDirection } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateContributionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trim)
  frenchTerm: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trim)
  bheteTerm: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(trim)
  toneNotation: string;

  @IsEnum(TranslationDirection)
  direction: TranslationDirection;

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
