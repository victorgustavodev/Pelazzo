import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  Length,
  IsISO8601,
  Matches,
  IsOptional,
  IsIn,
  IsUUID,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { IfDefined } from '../../../../shared/presentation/paging.dto.js';
export class CreateMatchDto {
  @ApiProperty() @IsString() @Length(1, 120) title!: string;
  @ApiProperty({ format: 'date-time', example: '2026-11-01T19:00:00-03:00' })
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  startsAt!: string;
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  location?: string | null;
}
export class UpdateMatchDto extends PartialType(CreateMatchDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional({ enum: ['SCHEDULED', 'FINISHED', 'CANCELED'] })
  @IfDefined()
  @IsIn(['SCHEDULED', 'FINISHED', 'CANCELED'])
  status?: 'SCHEDULED' | 'FINISHED' | 'CANCELED';
}
export class AddParticipationDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() participantId!: string;
  @ApiPropertyOptional({ nullable: true, type: 'integer', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  expectedAmountCents?: number | null;
}
export class UpdateParticipationDto {
  @ApiProperty({
    nullable: true,
    type: 'integer',
    minimum: 1,
    description: 'null remove o valor esperado.',
  })
  @ValidateIf((_obj: unknown, value: unknown) => value !== null)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  expectedAmountCents!: number | null;
}
