import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  Length,
  IsIn,
  IsUUID,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { IfDefined } from '../../../../shared/presentation/paging.dto.js';
export class CreateParticipantDto {
  @ApiProperty() @IsString() @Length(1, 120) name!: string;
  @ApiProperty({ enum: ['MONTHLY', 'DAILY'] })
  @IsIn(['MONTHLY', 'DAILY'])
  modality!: 'MONTHLY' | 'DAILY';
  @ApiPropertyOptional({ nullable: true, type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string | null;
}
export class UpdateParticipantDto extends PartialType(CreateParticipantDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional() @IfDefined() @IsBoolean() active?: boolean;
}
