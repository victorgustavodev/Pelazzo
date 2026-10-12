import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  Public,
  CurrentActor,
} from '../../../auth/presentation/auth.decorators.js';
import type { Actor } from '../../../../shared/domain/types.js';
import { ApiErrors } from '../../../../shared/presentation/swagger.js';
import * as Cases from '../../application/use-cases/attendance.use-cases.js';
import {
  CreateAttendanceLinkDto,
  AttendanceTokenDto,
  ConfirmAttendanceDto,
  CreatedAttendanceLinkDto,
  AttendanceLinkStateDto,
  PublicMatchDto,
  PublicAttendanceReceiptDto,
} from '../dto/attendance.dto.js';
@ApiTags('Link de presença')
@ApiBearerAuth('session')
@ApiErrors()
@Controller('groups/:groupId/matches/:matchId/attendance-link')
export class AttendanceLinksController {
  constructor(
    private readonly create: Cases.CreateAttendanceLinkUseCase,
    private readonly get: Cases.GetAttendanceLinkUseCase,
    private readonly revoke: Cases.RevokeAttendanceLinkUseCase,
  ) {}
  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Admin: confirmar partida e gerar/renovar link de presença',
    description:
      'Requer local definido e partida agendada. Renovar invalida o link anterior. Expira 24 horas após o horário da partida.',
  })
  @ApiCreatedResponse({ type: CreatedAttendanceLinkDto })
  generate(
    @CurrentActor() actor: Actor,
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Param('matchId', new ParseUUIDPipe()) matchId: string,
    @Body() dto: CreateAttendanceLinkDto,
  ) {
    return this.create.execute(actor, groupId, matchId, dto);
  }
  @Get()
  @ApiOperation({
    summary: 'Admin: consultar abertura da confirmação, sem segredo',
  })
  @ApiOkResponse({ type: AttendanceLinkStateDto })
  status(
    @CurrentActor() actor: Actor,
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Param('matchId', new ParseUUIDPipe()) matchId: string,
  ) {
    return this.get.execute(actor, groupId, matchId);
  }
  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Admin: encerrar o link sem remover presenças' })
  @ApiNoContentResponse()
  close(
    @CurrentActor() actor: Actor,
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Param('matchId', new ParseUUIDPipe()) matchId: string,
  ) {
    return this.revoke.execute(actor, groupId, matchId);
  }
}
@Public()
@ApiTags('Presença pública')
@ApiErrors()
@Controller('attendance')
export class PublicAttendanceController {
  constructor(
    private readonly get: Cases.GetPublicMatchUseCase,
    private readonly confirm: Cases.ConfirmPublicAttendanceUseCase,
  ) {}
  @Post('details')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Consultar somente os dados públicos de uma partida com link válido',
    description:
      'Sem login. Token no corpo para não expor o segredo nos caminhos das requisições.',
  })
  @ApiOkResponse({ type: PublicMatchDto })
  details(@Body() dto: AttendanceTokenDto) {
    return this.get.execute(dto.token);
  }
  @Post('confirm')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Confirmar presença informando somente o nome',
    description:
      'Reenvios do mesmo nome normalizado não duplicam presença. Não cria conta nem altera pagamentos.',
  })
  @ApiOkResponse({ type: PublicAttendanceReceiptDto })
  attendance(@Body() dto: ConfirmAttendanceDto) {
    return this.confirm.execute(dto.token, dto.name);
  }
}
