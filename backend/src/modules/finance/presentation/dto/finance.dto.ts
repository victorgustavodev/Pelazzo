import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsString,
  Length,
  IsIn,
  IsOptional,
  Matches,
  IsISO8601,
} from 'class-validator';
import {
  PagingDto,
  IfDefined,
} from '../../../../shared/presentation/paging.dto.js';
export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() participantId!: string;
  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'uuid',
    description: 'Exclusivo com competence.',
  })
  @IsOptional()
  @IsUUID()
  matchParticipantId?: string | null;
  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: '2026-10',
    description: 'Exclusivo com matchParticipantId.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/)
  competence?: string | null;
  @ApiProperty({
    type: 'integer',
    example: 2750,
    minimum: 1,
    maximum: 2147483647,
  })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  amountCents!: number;
  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Quando omitida, usa o instante do registro.',
  })
  @IfDefined()
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  receivedAt?: string;
  @ApiProperty({ enum: ['PIX', 'CASH', 'OTHER'] })
  @IsIn(['PIX', 'CASH', 'OTHER'])
  method!: 'PIX' | 'CASH' | 'OTHER';
  @ApiProperty({
    description:
      'Identificador único da operação na pelada. Reenvie a mesma chave para repetir a operação sem duplicar.',
    example: 'pagamento-001',
  })
  @IsString()
  @Length(1, 128)
  idempotencyKey!: string;
}
export class CorrectPaymentDto extends CreatePaymentDto {
  @ApiProperty() @IsString() @Length(1, 500) reason!: string;
}
export class CreateExpenseDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() matchId!: string;
  @ApiProperty() @IsString() @Length(1, 255) description!: string;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 2147483647 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  amountCents!: number;
  @ApiPropertyOptional({ format: 'date-time' })
  @IfDefined()
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  occurredAt?: string;
  @ApiProperty() @IsString() @Length(1, 128) idempotencyKey!: string;
}
export class CorrectExpenseDto extends CreateExpenseDto {
  @ApiProperty() @IsString() @Length(1, 500) reason!: string;
}
export class VoidDto {
  @ApiProperty() @IsString() @Length(1, 500) reason!: string;
}
export class PaymentQueryDto extends PagingDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  participantId?: string;
}
export class ExpenseQueryDto extends PagingDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  matchId?: string;
}
