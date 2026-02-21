import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: "L'email est requis" })
  @IsEmail({}, { message: "Format d'email invalide" })
  @MaxLength(255, { message: "L'email ne doit pas dépasser 255 caractères" })
  email: string;

  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une lettre et un chiffre',
  })
  password: string;
}
