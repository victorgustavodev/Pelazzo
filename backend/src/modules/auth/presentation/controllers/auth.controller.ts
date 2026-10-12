import { Body, Controller, Get, Post, HttpCode, Headers } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public, CurrentActor, bearerToken } from '../auth.decorators.js';
import type { Actor } from '../../../../shared/domain/types.js';
import { RegisterDto, LoginDto, ChangePasswordDto } from '../dto/auth.dto.js';
import {
  IdentityDto,
  SessionGrantDto,
} from '../../../../shared/presentation/responses.dto.js';
import { ApiErrors } from '../../../../shared/presentation/swagger.js';
import {
  RegisterUseCase,
  LoginUseCase,
  LogoutUseCase,
  ChangePasswordUseCase,
} from '../../application/use-cases/auth.use-cases.js';
@ApiTags('Autenticação')
@ApiErrors()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerAccount: RegisterUseCase,
    private readonly signIn: LoginUseCase,
    private readonly signOut: LogoutUseCase,
    private readonly password: ChangePasswordUseCase,
  ) {}
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiTooManyRequestsResponse()
  @ApiOperation({ summary: 'Cadastrar conta por e-mail e senha' })
  @ApiCreatedResponse({ type: SessionGrantDto })
  register(@Body() dto: RegisterDto) {
    return this.registerAccount.execute(dto);
  }
  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiTooManyRequestsResponse()
  @ApiOperation({ summary: 'Entrar e obter token de sessão' })
  @ApiOkResponse({ type: SessionGrantDto })
  login(@Body() dto: LoginDto) {
    return this.signIn.execute(dto);
  }
  @Get('me')
  @ApiBearerAuth('session')
  @ApiOperation({ summary: 'Consultar a conta autenticada' })
  @ApiOkResponse({ type: IdentityDto })
  me(@CurrentActor() actor: Actor) {
    return actor;
  }
  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth('session')
  @ApiOperation({ summary: 'Revogar a sessão atual' })
  @ApiNoContentResponse()
  logout(@Headers('authorization') header: string) {
    return this.signOut.execute(bearerToken(header));
  }
  @Post('change-password')
  @HttpCode(204)
  @ApiBearerAuth('session')
  @ApiOperation({ summary: 'Alterar senha e revogar outras sessões' })
  @ApiNoContentResponse()
  changePassword(
    @Headers('authorization') header: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.password.execute(bearerToken(header), dto);
  }
}
