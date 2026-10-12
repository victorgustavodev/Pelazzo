import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { CurrentActor } from '../../../auth/presentation/auth.decorators.js';
import type { Actor } from '../../../../shared/domain/types.js';
import { PagingDto } from '../../../../shared/presentation/paging.dto.js';
import { ApiErrors, ApiPage } from '../../../../shared/presentation/swagger.js';
import {
  MatchDto,
  ParticipationDto,
} from '../../../../shared/presentation/responses.dto.js';
import {
  CreateMatchDto,
  UpdateMatchDto,
  AddParticipationDto,
  UpdateParticipationDto,
} from '../dto/matches.dto.js';
import * as Cases from '../../application/use-cases/matches.use-cases.js';
const Gid = () => Param('groupId', new ParseUUIDPipe());
const Id = () => Param('id', new ParseUUIDPipe());
@ApiTags('Partidas')
@ApiBearerAuth('session')
@ApiErrors()
@Controller('groups/:groupId/matches')
export class MatchesController {
  constructor(
    private readonly createMatch: Cases.CreateMatchUseCase,
    private readonly listMatches: Cases.ListMatchesUseCase,
    private readonly getMatch: Cases.GetMatchUseCase,
    private readonly updateMatch: Cases.UpdateMatchUseCase,
    private readonly cancelMatch: Cases.CancelMatchUseCase,
    private readonly addPlayer: Cases.AddParticipationUseCase,
    private readonly players: Cases.ListParticipationsUseCase,
  ) {}
  @Post()
  @ApiOperation({ summary: 'Admin: criar partida' })
  @ApiCreatedResponse({ type: MatchDto })
  create(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Body() dto: CreateMatchDto,
  ) {
    return this.createMatch.execute(actor, groupId, dto);
  }
  @Get()
  @ApiOperation({ summary: 'Listar partidas' })
  @ApiPage(MatchDto)
  list(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Query() query: PagingDto,
  ) {
    return this.listMatches.execute(actor, groupId, query);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Consultar partida' })
  @ApiOkResponse({ type: MatchDto })
  get(@CurrentActor() actor: Actor, @Gid() groupId: string, @Id() id: string) {
    return this.getMatch.execute(actor, groupId, id);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Admin: alterar partida ou seu estado' })
  @ApiOkResponse({ type: MatchDto })
  update(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
    @Body() dto: UpdateMatchDto,
  ) {
    return this.updateMatch.execute(actor, groupId, id, dto);
  }
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Admin: cancelar partida preservando seu histórico',
  })
  @ApiNoContentResponse()
  cancel(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
  ) {
    return this.cancelMatch.execute(actor, groupId, id);
  }
  @Post(':id/participants')
  @ApiOperation({
    summary: 'Admin: associar participante e valor esperado opcional',
  })
  @ApiCreatedResponse({ type: ParticipationDto })
  add(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
    @Body() dto: AddParticipationDto,
  ) {
    return this.addPlayer.execute(actor, groupId, id, dto);
  }
  @Get(':id/participants')
  @ApiOperation({
    summary:
      'Listar presenças; valores individuais visíveis somente ao titular/admin',
  })
  @ApiPage(ParticipationDto)
  participants(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
    @Query() query: PagingDto,
  ) {
    return this.players.execute(actor, groupId, id, query);
  }
}
@ApiTags('Presenças')
@ApiBearerAuth('session')
@ApiErrors()
@Controller('groups/:groupId/participations')
export class ParticipationsController {
  constructor(
    private readonly updateExpected: Cases.UpdateParticipationUseCase,
    private readonly removePlayer: Cases.RemoveParticipationUseCase,
  ) {}
  @Patch(':id')
  @ApiOperation({
    summary: 'Admin: definir ou remover valor esperado individual',
  })
  @ApiOkResponse({ type: ParticipationDto })
  update(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
    @Body() dto: UpdateParticipationDto,
  ) {
    return this.updateExpected.execute(
      actor,
      groupId,
      id,
      dto.expectedAmountCents,
    );
  }
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Admin: remover presença sem histórico financeiro' })
  @ApiNoContentResponse()
  remove(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
  ) {
    return this.removePlayer.execute(actor, groupId, id);
  }
}
