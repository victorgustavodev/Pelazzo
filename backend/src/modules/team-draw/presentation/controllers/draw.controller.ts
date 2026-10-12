import {
  Body,
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrentActor } from '../../../auth/presentation/auth.decorators.js';
import type { Actor } from '../../../../shared/domain/types.js';
import { ApiErrors } from '../../../../shared/presentation/swagger.js';
import { DrawResultDto } from '../../../../shared/presentation/responses.dto.js';
import { DrawTeamsDto } from '../dto/draw.dto.js';
import { DrawTeamsUseCase } from '../../application/use-cases/draw-teams.use-case.js';
@ApiTags('Sorteio')
@ApiBearerAuth('session')
@ApiErrors()
@Controller('groups/:groupId/team-draws')
export class DrawController {
  constructor(private readonly draw: DrawTeamsUseCase) {}
  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sortear times aleatórios como usuário ou administrador',
    description:
      'Exige quantidade exata de pessoas. Goleiro conta no tamanho do time. Não altera presença ou financeiro e não persiste o resultado.',
  })
  @ApiOkResponse({ type: DrawResultDto })
  create(
    @CurrentActor() actor: Actor,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: DrawTeamsDto,
  ) {
    return this.draw.execute(actor, groupId, dto);
  }
}
