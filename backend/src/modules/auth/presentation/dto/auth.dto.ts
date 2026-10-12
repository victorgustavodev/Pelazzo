import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Length(3, 254)
  email!: string;
  @ApiProperty({
    example: 'UmaSenhaForte123!',
    minLength: 12,
    maxLength: 128,
    format: 'password',
  })
  @IsString()
  @Length(12, 128)
  password!: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty({ example: 'Administrador' })
  @IsString()
  @Length(1, 120)
  displayName!: string;
}
export class ChangePasswordDto {
  @ApiProperty({ format: 'password' })
  @IsString()
  @Length(12, 128)
  currentPassword!: string;
  @ApiProperty({ format: 'password' })
  @IsString()
  @Length(12, 128)
  newPassword!: string;
}
