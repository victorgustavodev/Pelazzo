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
  GroupDto,
  MemberDto,
  InvitationDto,
  CreatedInvitationDto,
  PixDto,
  PixResponseDto,
  AuditDto,
} from '../../../../shared/presentation/responses.dto.js';
import {
  CreateGroupDto,
  UpdateGroupDto,
  UpdateMemberDto,
  CreateInvitationDto,
  UpdatePixDto,
  AcceptInvitationDto,
} from '../dto/groups.dto.js';
import * as Cases from '../../application/use-cases/groups.use-cases.js';
const GroupId = () => Param('groupId', new ParseUUIDPipe());
const Id = (name: string) => Param(name, new ParseUUIDPipe());
@ApiTags('Peladas e administração')
@ApiBearerAuth('session')
@ApiErrors()
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly createGroup: Cases.CreateGroupUseCase,
    private readonly listGroups: Cases.ListGroupsUseCase,
    private readonly getGroup: Cases.GetGroupUseCase,
    private readonly updateGroup: Cases.UpdateGroupUseCase,
    private readonly listMembers: Cases.ListMembersUseCase,
    private readonly myMembership: Cases.GetMyMembershipUseCase,
    private readonly updateMember: Cases.UpdateMemberUseCase,
    private readonly invite: Cases.CreateInvitationUseCase,
    private readonly invites: Cases.ListInvitationsUseCase,
    private readonly revoke: Cases.RevokeInvitationUseCase,
    private readonly getPix: Cases.GetPixUseCase,
    private readonly setPix: Cases.UpdatePixUseCase,
    private readonly clearPix: Cases.ClearPixUseCase,
    private readonly audit: Cases.ListAuditUseCase,
  ) {}
  @Post()
  @ApiOperation({
    summary: 'Criar pelada e tornar-se o primeiro administrador',
  })
  @ApiCreatedResponse({ type: GroupDto })
  create(@CurrentActor() actor: Actor, @Body() dto: CreateGroupDto) {
    return this.createGroup.execute(actor, dto);
  }
  @Get()
  @ApiOperation({ summary: 'Listar minhas peladas ativas' })
  @ApiPage(GroupDto)
  list(@CurrentActor() actor: Actor, @Query() query: PagingDto) {
    return this.listGroups.execute(actor, query);
  }
  @Get(':groupId')
  @ApiOperation({ summary: 'Consultar uma pelada' })
  @ApiOkResponse({ type: GroupDto })
  get(@CurrentActor() actor: Actor, @GroupId() id: string) {
    return this.getGroup.execute(actor, id);
  }
  @Patch(':groupId')
  @ApiOperation({ summary: 'Admin: alterar nome, cor e fuso horário' })
  @ApiOkResponse({ type: GroupDto })
  update(
    @CurrentActor() actor: Actor,
    @GroupId() id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.updateGroup.execute(actor, id, dto);
  }
  @Get(':groupId/members')
  @ApiOperation({ summary: 'Listar membros da pelada' })
  @ApiPage(MemberDto)
  members(
    @CurrentActor() actor: Actor,
    @GroupId() id: string,
    @Query() query: PagingDto,
  ) {
    return this.listMembers.execute(actor, id, query);
  }
  @Get(':groupId/membership')
  @ApiOperation({ summary: 'Consultar meu vínculo e perfil atual na pelada' })
  @ApiOkResponse({ type: MemberDto })
  membership(@CurrentActor() actor: Actor, @GroupId() id: string) {
    return this.myMembership.execute(actor, id);
  }
  @Patch(':groupId/members/:userId')
  @ApiOperation({
    summary: 'Admin: mudar perfil ou atividade do membro',
    description:
      'Preserva o último admin. Rebaixar/desativar o destinatário Pix remove sua configuração na mesma transação.',
  })
  @ApiOkResponse({ type: MemberDto })
  member(
    @CurrentActor() actor: Actor,
    @GroupId() id: string,
    @Id('userId') userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.updateMember.execute(actor, id, userId, dto);
  }
  @Post(':groupId/invitations')
  @ApiOperation({ summary: 'Admin: criar convite vinculado a e-mail' })
  @ApiCreatedResponse({ type: CreatedInvitationDto })
  invitation(
    @CurrentActor() actor: Actor,
    @GroupId() id: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invite.execute(actor, id, dto);
  }
  @Get(':groupId/invitations')
  @ApiOperation({ summary: 'Admin: listar convites sem seus tokens' })
  @ApiPage(InvitationDto)
  invitations(
    @CurrentActor() actor: Actor,
    @GroupId() id: string,
    @Query() query: PagingDto,
  ) {
    return this.invites.execute(actor, id, query);
  }
  @Delete(':groupId/invitations/:invitationId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Admin: revogar convite não utilizado' })
  @ApiNoContentResponse()
  revokeInvitation(
    @CurrentActor() actor: Actor,
    @GroupId() id: string,
    @Id('invitationId') invitationId: string,
  ) {
    return this.revoke.execute(actor, id, invitationId);
  }
  @Get(':groupId/pix')
  @ApiOperation({ summary: 'Consultar Pix e contato para comprovante' })
  @ApiOkResponse({ type: PixResponseDto })
  async pix(@CurrentActor() actor: Actor, @GroupId() id: string) {
    return { settings: await this.getPix.execute(actor, id) };
  }
  @Patch(':groupId/pix')
  @ApiOperation({ summary: 'Admin: configurar chave Pix e destinatário' })
  @ApiOkResponse({ type: PixDto })
  updatePix(
    @CurrentActor() actor: Actor,
    @GroupId() id: string,
    @Body() dto: UpdatePixDto,
  ) {
    return this.setPix.execute(actor, id, dto);
  }
  @Delete(':groupId/pix')
  @HttpCode(204)
  @ApiOperation({ summary: 'Admin: remover configuração Pix' })
  @ApiNoContentResponse()
  deletePix(@CurrentActor() actor: Actor, @GroupId() id: string) {
    return this.clearPix.execute(actor, id);
  }
  @Get(':groupId/audit')
  @ApiOperation({ summary: 'Admin: consultar auditoria da pelada' })
  @ApiPage(AuditDto)
  auditEvents(
    @CurrentActor() actor: Actor,
    @GroupId() id: string,
    @Query() query: PagingDto,
  ) {
    return this.audit.execute(actor, id, query);
  }
}
@ApiTags('Convites')
@ApiBearerAuth('session')
@ApiErrors()
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly accept: Cases.AcceptInvitationUseCase) {}
  @Post('accept')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Aceitar convite usando a conta do e-mail destinatário',
  })
  @ApiOkResponse({ type: MemberDto })
  join(@CurrentActor() actor: Actor, @Body() dto: AcceptInvitationDto) {
    return this.accept.execute(actor, dto.token);
  }
}
