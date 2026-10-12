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
import { ParticipantDto } from '../../../../shared/presentation/responses.dto.js';
import {
  CreateParticipantDto,
  UpdateParticipantDto,
} from '../dto/participants.dto.js';
import * as Cases from '../../application/use-cases/participants.use-cases.js';
const Gid = () => Param('groupId', new ParseUUIDPipe());
const Id = () => Param('id', new ParseUUIDPipe());
@ApiTags('Participantes')
@ApiBearerAuth('session')
@ApiErrors()
@Controller('groups/:groupId/participants')
export class ParticipantsController {
  constructor(
    private readonly createPlayer: Cases.CreateParticipantUseCase,
    private readonly listPlayers: Cases.ListParticipantsUseCase,
    private readonly getPlayer: Cases.GetParticipantUseCase,
    private readonly updatePlayer: Cases.UpdateParticipantUseCase,
    private readonly deactivate: Cases.DeactivateParticipantUseCase,
  ) {}
  @Post()
  @ApiOperation({ summary: 'Admin: cadastrar mensalista ou diarista' })
  @ApiCreatedResponse({ type: ParticipantDto })
  create(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Body() dto: CreateParticipantDto,
  ) {
    return this.createPlayer.execute(actor, groupId, dto);
  }
  @Get()
  @ApiOperation({ summary: 'Listar participantes da pelada' })
  @ApiPage(ParticipantDto)
  list(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Query() query: PagingDto,
  ) {
    return this.listPlayers.execute(actor, groupId, query);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Consultar participante' })
  @ApiOkResponse({ type: ParticipantDto })
  get(@CurrentActor() actor: Actor, @Gid() groupId: string, @Id() id: string) {
    return this.getPlayer.execute(actor, groupId, id);
  }
  @Patch(':id')
  @ApiOperation({
    summary: 'Admin: alterar participante sem modificar modalidade histórica',
  })
  @ApiOkResponse({ type: ParticipantDto })
  update(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
    @Body() dto: UpdateParticipantDto,
  ) {
    return this.updatePlayer.execute(actor, groupId, id, dto);
  }
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Admin: desativar participante preservando histórico',
  })
  @ApiNoContentResponse()
  remove(
    @CurrentActor() actor: Actor,
    @Gid() groupId: string,
    @Id() id: string,
  ) {
    return this.deactivate.execute(actor, groupId, id);
  }
}
