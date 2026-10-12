import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';
import { IfDefined } from '../../../../shared/presentation/paging.dto.js';
export class CreateAttendanceLinkDto {
  @ApiPropertyOptional({
    description:
      'Campo ou endereço da partida. Obrigatório se ainda não estiver definido.',
  })
  @IfDefined()
  @IsString()
  @Length(1, 255)
  location?: string;
}
export class AttendanceTokenDto {
  @ApiProperty({ minLength: 64, maxLength: 64 })
  @IsString()
  @Matches(/^[0-9a-f]{64}$/)
  token!: string;
}
export class ConfirmAttendanceDto extends AttendanceTokenDto {
  @ApiProperty({ description: 'Nome ou apelido que identifique o jogador.' })
  @IsString()
  @Length(1, 120)
  name!: string;
}
export class CreatedAttendanceLinkDto {
  @ApiProperty({
    description:
      'Exibido apenas na geração. Use no fragmento do link do frontend, nunca nos logs.',
  })
  token!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}
export class AttendanceLinkInfoDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty() active!: boolean;
}
export class AttendanceLinkStateDto {
  @ApiProperty({ type: AttendanceLinkInfoDto, nullable: true })
  link!: AttendanceLinkInfoDto | null;
}
export class PublicMatchDto {
  @ApiProperty() groupName!: string;
  @ApiProperty() primaryColor!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty() location!: string;
}
export class PublicAttendanceReceiptDto {
  @ApiProperty() name!: string;
  @ApiProperty({ type: PublicMatchDto }) match!: PublicMatchDto;
}
