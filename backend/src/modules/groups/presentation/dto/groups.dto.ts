import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  Length,
  IsHexColor,
  IsEmail,
  IsIn,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsUUID,
  Matches,
} from 'class-validator';
import { IfDefined } from '../../../../shared/presentation/paging.dto.js';
export class CreateGroupDto {
  @ApiProperty({ example: 'Pelada dos irresponsáveis' })
  @IsString()
  @Length(2, 80)
  name!: string;
  @ApiPropertyOptional({ example: '#15803D', default: '#15803D' })
  @IfDefined()
  @IsHexColor()
  @Matches(/^#[0-9a-f]{6}$/i)
  primaryColor?: string;
  @ApiPropertyOptional({ default: 'America/Sao_Paulo' })
  @IfDefined()
  @IsString()
  @Length(1, 100)
  timezone?: string;
}
export class UpdateGroupDto extends PartialType(CreateGroupDto, {
  skipNullProperties: false,
}) {}
export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: ['USER', 'ADMIN'] })
  @IfDefined()
  @IsIn(['USER', 'ADMIN'])
  role?: 'USER' | 'ADMIN';
  @ApiPropertyOptional() @IfDefined() @IsBoolean() active?: boolean;
}
export class CreateInvitationDto {
  @ApiProperty({ example: 'jogador@example.com' })
  @IsEmail()
  @Length(3, 254)
  email!: string;
  @ApiPropertyOptional({ enum: ['USER', 'ADMIN'], default: 'USER' })
  @IfDefined()
  @IsIn(['USER', 'ADMIN'])
  role?: 'USER' | 'ADMIN';
  @ApiPropertyOptional({ default: 7, minimum: 1, maximum: 30 })
  @IfDefined()
  @IsInt()
  @Min(1)
  @Max(30)
  ttlDays?: number;
}
export class AcceptInvitationDto {
  @ApiProperty({ minLength: 64, maxLength: 64 })
  @IsString()
  @Matches(/^[0-9a-f]{64}$/)
  token!: string;
}
export class UpdatePixDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() recipientAdminUserId!: string;
  @ApiProperty({ enum: ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'] })
  @IsIn(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'])
  keyType!: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  @ApiProperty({ example: 'pix@example.com' })
  @IsString()
  @Length(1, 255)
  keyValue!: string;
  @ApiProperty({ example: 'Nome do favorecido' })
  @IsString()
  @Length(1, 120)
  recipientName!: string;
  @ApiProperty({ example: '+5511999999999' })
  @IsString()
  @Length(8, 32)
  contactPhone!: string;
}
