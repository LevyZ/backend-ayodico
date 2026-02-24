import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsNotEmpty({ message: 'Le refresh token est requis' })
  @IsString()
  refreshToken: string;
}

