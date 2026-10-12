import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class IdentityDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ format: 'email' }) email!: string;
}
export class SessionGrantDto {
  @ApiProperty({ description: 'Token de sessão; não é JWT.' }) token!: string;
  @ApiProperty({ type: IdentityDto }) user!: IdentityDto;
}
export class EntityDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
export class GroupDto extends EntityDto {
  @ApiProperty() name!: string;
  @ApiProperty({ example: '#15803D' }) primaryColor!: string;
  @ApiProperty({ example: 'America/Sao_Paulo' }) timezone!: string;
}
export class MemberDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) groupId!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ enum: ['USER', 'ADMIN'] }) role!: string;
  @ApiProperty() active!: boolean;
  @ApiPropertyOptional({
    description:
      'Indica remoção de Pix ao desativar/rebaixar seu destinatário.',
  })
  pixCleared?: boolean;
}
export class InvitationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) groupId!: string;
  @ApiProperty({ format: 'email' }) email!: string;
  @ApiProperty({ enum: ['USER', 'ADMIN'] }) role!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ format: 'uuid' }) createdBy!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  acceptedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) acceptedBy!:
    string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  revokedAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
export class CreatedInvitationDto extends InvitationDto {
  @ApiProperty({
    description:
      'Segredo exibido apenas na criação; compartilhe manualmente com o destinatário.',
  })
  token!: string;
}
export class PixDto {
  @ApiProperty({ format: 'uuid' }) groupId!: string;
  @ApiProperty({ format: 'uuid' }) recipientAdminUserId!: string;
  @ApiProperty({ enum: ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'] })
  keyType!: string;
  @ApiProperty() keyValue!: string;
  @ApiProperty() recipientName!: string;
  @ApiProperty({ example: '+5511999999999' }) contactPhone!: string;
  @ApiPropertyOptional({
    description: 'Link do WhatsApp; abrir não confirma envio ou pagamento.',
  })
  receiptUrl?: string;
}
export class PixResponseDto {
  @ApiProperty({
    type: PixDto,
    nullable: true,
    description: 'null quando não há chave configurada.',
  })
  settings!: PixDto | null;
}
export class AuditDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) groupId!: string;
  @ApiProperty({ format: 'uuid' }) actorUserId!: string;
  @ApiProperty() action!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty({ format: 'uuid' }) entityId!: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: object;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
export class ParticipantDto extends EntityDto {
  @ApiProperty({ format: 'uuid' }) groupId!: string;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) userId!:
    string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['MONTHLY', 'DAILY'] }) modality!: string;
  @ApiProperty() active!: boolean;
}
export class MatchDto extends EntityDto {
  @ApiProperty({ format: 'uuid' }) groupId!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ nullable: true, type: String }) location!: string | null;
  @ApiProperty({ enum: ['SCHEDULED', 'FINISHED', 'CANCELED'] }) status!: string;
}
export class ParticipationDto extends EntityDto {
  @ApiProperty({ format: 'uuid' }) groupId!: string;
  @ApiProperty({ format: 'uuid' }) matchId!: string;
  @ApiProperty({ format: 'uuid' }) participantId!: string;
  @ApiProperty({ enum: ['MONTHLY', 'DAILY'] }) modalitySnapshot!: string;
  @ApiPropertyOptional({
    type: 'integer',
    nullable: true,
    description: 'Disponível apenas para admin ou titular.',
  })
  expectedAmountCents?: number | null;
}
export class FinancialDto extends EntityDto {
  @ApiProperty({ format: 'uuid' }) groupId!: string;
  @ApiProperty({ type: 'integer', minimum: 1 }) amountCents!: number;
  @ApiProperty({ enum: ['BRL'] }) currency!: string;
  @ApiProperty({ enum: ['CONFIRMED', 'VOIDED'] }) status!: string;
  @ApiProperty({ format: 'uuid' }) recordedBy!: string;
  @ApiProperty({ nullable: true, type: String }) voidReason!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) voidedBy!:
    string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  voidedAt!: string | null;
  @ApiProperty() idempotencyKey!: string;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) replacesId!:
    string | null;
}
export class PaymentDto extends FinancialDto {
  @ApiProperty({ format: 'uuid' }) participantId!: string;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' })
  matchParticipantId!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '2026-10' })
  competence!: string | null;
  @ApiProperty({ format: 'date-time' }) receivedAt!: string;
  @ApiProperty({ enum: ['PIX', 'CASH', 'OTHER'] }) method!: string;
}
export class ExpenseDto extends FinancialDto {
  @ApiProperty({ format: 'uuid' }) matchId!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
}
export class PaymentCorrectionDto {
  @ApiProperty({ type: PaymentDto }) original!: PaymentDto;
  @ApiProperty({ type: PaymentDto }) replacement!: PaymentDto;
}
export class ExpenseCorrectionDto {
  @ApiProperty({ type: ExpenseDto }) original!: ExpenseDto;
  @ApiProperty({ type: ExpenseDto }) replacement!: ExpenseDto;
}
export class CashDto {
  @ApiProperty({ type: 'integer' }) revenueCents!: number;
  @ApiProperty({ type: 'integer' }) expenseCents!: number;
  @ApiProperty({ type: 'integer', description: 'Pode ser negativo.' })
  balanceCents!: number;
  @ApiProperty({ enum: ['BRL'] }) currency!: string;
}
export class SettlementDto {
  @ApiProperty({ format: 'uuid' }) participationId!: string;
  @ApiProperty({ enum: ['UNDEFINED', 'UNPAID', 'PARTIAL', 'PAID'] })
  status!: string;
  @ApiProperty({ type: 'integer', nullable: true }) expectedAmountCents!:
    number | null;
  @ApiProperty({ type: 'integer' }) paidAmountCents!: number;
  @ApiProperty({ type: 'integer', nullable: true }) remainingAmountCents!:
    number | null;
  @ApiProperty({
    type: 'integer',
    description: 'Excedente informativo; não cria crédito.',
  })
  excessAmountCents!: number;
}
export class DrawPlayerResultDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() goalkeeper!: boolean;
}
export class DrawTeamDto {
  @ApiProperty({ type: 'integer' }) number!: number;
  @ApiProperty({ type: [DrawPlayerResultDto] }) players!: DrawPlayerResultDto[];
}
export class DrawResultDto {
  @ApiProperty({ type: [DrawTeamDto] }) teams!: DrawTeamDto[];
}
