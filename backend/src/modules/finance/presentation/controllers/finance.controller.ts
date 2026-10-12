import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrentActor } from '../../../auth/presentation/auth.decorators.js';
import type { Actor } from '../../../../shared/domain/types.js';
import { ApiErrors, ApiPage } from '../../../../shared/presentation/swagger.js';
import {
  PaymentDto,
  ExpenseDto,
  PaymentCorrectionDto,
  ExpenseCorrectionDto,
  CashDto,
  SettlementDto,
} from '../../../../shared/presentation/responses.dto.js';
import {
  CreatePaymentDto,
  CorrectPaymentDto,
  CreateExpenseDto,
  CorrectExpenseDto,
  VoidDto,
  PaymentQueryDto,
  ExpenseQueryDto,
} from '../dto/finance.dto.js';
import * as Cases from '../../application/use-cases/finance.use-cases.js';
const Gid = () => Param('groupId', new ParseUUIDPipe());
const Id = () => Param('id', new ParseUUIDPipe());
@ApiTags('Financeiro')
@ApiBearerAuth('session')
@ApiErrors()
@Controller('groups/:groupId')
export class FinanceController {
  constructor(
    private readonly createPayment: Cases.CreatePaymentUseCase,
    private readonly listPayments: Cases.ListPaymentsUseCase,
    private readonly getPayment: Cases.GetPaymentUseCase,
    private readonly voidPayment: Cases.VoidPaymentUseCase,
    private readonly correctPayment: Cases.CorrectPaymentUseCase,
    private readonly createExpense: Cases.CreateExpenseUseCase,
    private readonly listExpenses: Cases.ListExpensesUseCase,
    private readonly getExpense: Cases.GetExpenseUseCase,
    private readonly voidExpense: Cases.VoidExpenseUseCase,
    private readonly correctExpense: Cases.CorrectExpenseUseCase,
    private readonly cash: Cases.GetCashUseCase,
    private readonly settlement: Cases.GetSettlementUseCase,
  ) {}
  @Post('payments')
  @ApiOperation({
    summary: 'Admin: registrar recebimento confirmado com valor livre',
  })
  @ApiCreatedResponse({ type: PaymentDto })
  payment(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.createPayment.execute(actor, groupId, dto);
  }
  @Get('payments')
  @ApiOperation({
    summary: 'Listar pagamentos; usuários veem somente os próprios',
  })
  @ApiPage(PaymentDto)
  payments(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Query() query: PaymentQueryDto,
  ) {
    return this.listPayments.execute(actor, groupId, query);
  }
  @Get('payments/:id')
  @ApiOperation({
    summary: 'Consultar pagamento próprio ou como administrador',
  })
  @ApiOkResponse({ type: PaymentDto })
  paymentById(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
  ) {
    return this.getPayment.execute(actor, groupId, id);
  }
  @Post('payments/:id/void')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin: anular recebimento com motivo' })
  @ApiOkResponse({ type: PaymentDto })
  annulPayment(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
    @Body() dto: VoidDto,
  ) {
    return this.voidPayment.execute(actor, groupId, id, dto.reason);
  }
  @Post('payments/:id/corrections')
  @ApiOperation({
    summary:
      'Admin: anular original e criar recebimento substituto atomicamente',
    description:
      'Use nova chave de idempotência para o substituto. Repetições com a mesma chave não criam outro lançamento.',
  })
  @ApiCreatedResponse({ type: PaymentCorrectionDto })
  replacePayment(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
    @Body() dto: CorrectPaymentDto,
  ) {
    return this.correctPayment.execute(actor, groupId, id, dto);
  }
  @Post('expenses')
  @ApiOperation({ summary: 'Admin: registrar despesa da partida' })
  @ApiCreatedResponse({ type: ExpenseDto })
  expense(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.createExpense.execute(actor, groupId, dto);
  }
  @Get('expenses')
  @ApiOperation({ summary: 'Admin: listar despesas' })
  @ApiPage(ExpenseDto)
  expenses(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Query() query: ExpenseQueryDto,
  ) {
    return this.listExpenses.execute(actor, groupId, query);
  }
  @Get('expenses/:id')
  @ApiOperation({ summary: 'Admin: consultar despesa' })
  @ApiOkResponse({ type: ExpenseDto })
  expenseById(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
  ) {
    return this.getExpense.execute(actor, groupId, id);
  }
  @Post('expenses/:id/void')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin: anular despesa com motivo' })
  @ApiOkResponse({ type: ExpenseDto })
  annulExpense(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
    @Body() dto: VoidDto,
  ) {
    return this.voidExpense.execute(actor, groupId, id, dto.reason);
  }
  @Post('expenses/:id/corrections')
  @ApiOperation({ summary: 'Admin: corrigir despesa preservando original' })
  @ApiCreatedResponse({ type: ExpenseCorrectionDto })
  replaceExpense(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
    @Body() dto: CorrectExpenseDto,
  ) {
    return this.correctExpense.execute(actor, groupId, id, dto);
  }
  @Get('finance/summary')
  @ApiOperation({
    summary:
      'Consultar totais gerais; inclui recebimentos mensais e de partidas',
  })
  @ApiOkResponse({ type: CashDto })
  summary(@CurrentActor() actor: Actor, @Gid() groupId: string) {
    return this.cash.execute(actor, groupId);
  }
  @Get('matches/:id/cash')
  @ApiOperation({
    summary: 'Consultar caixa da partida; mensalidade sem partida não entra',
  })
  @ApiOkResponse({ type: CashDto })
  matchCash(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
  ) {
    return this.cash.execute(actor, groupId, id);
  }
  @Get('participations/:id/settlement')
  @ApiOperation({
    summary: 'Consultar situação financeira própria ou como admin',
  })
  @ApiOkResponse({ type: SettlementDto })
  paymentStatus(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
  ) {
    return this.settlement.execute(actor, groupId, id);
  }
}
