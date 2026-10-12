import { Module } from '@nestjs/common';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../shared/domain/unit-of-work.js';
import { RUNTIME, type Runtime } from '../../shared/domain/types.js';
import * as Cases from './application/use-cases/finance.use-cases.js';
import { FinanceController } from './presentation/controllers/finance.controller.js';
@Module({
  controllers: [FinanceController],
  providers: [
    ...[
      Cases.CreatePaymentUseCase,
      Cases.VoidPaymentUseCase,
      Cases.CorrectPaymentUseCase,
      Cases.CreateExpenseUseCase,
      Cases.VoidExpenseUseCase,
      Cases.CorrectExpenseUseCase,
    ].map((useCase) => ({
      provide: useCase,
      inject: [UNIT_OF_WORK, RUNTIME],
      useFactory: (work: UnitOfWork, runtime: Runtime) =>
        new useCase(work, runtime),
    })),
    ...[
      Cases.ListPaymentsUseCase,
      Cases.GetPaymentUseCase,
      Cases.ListExpensesUseCase,
      Cases.GetExpenseUseCase,
      Cases.GetCashUseCase,
      Cases.GetSettlementUseCase,
    ].map((useCase) => ({
      provide: useCase,
      inject: [UNIT_OF_WORK],
      useFactory: (work: UnitOfWork) => new useCase(work),
    })),
  ],
})
export class FinanceModule {}
