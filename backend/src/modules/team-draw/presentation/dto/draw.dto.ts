import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
  IsUUID,
  IsString,
  Length,
} from 'class-validator';
import { IfDefined } from '../../../../shared/presentation/paging.dto.js';
export class DrawPlayerDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Quando omitido, será gerado.',
  })
  @IfDefined()
  @IsUUID()
  id?: string;
  @ApiProperty({ description: 'Inclua apelido para distinguir homônimos.' })
  @IsString()
  @Length(1, 120)
  name!: string;
  @ApiPropertyOptional({ default: false }) @IsBoolean() goalkeeper = false;
}
export class DrawTeamsDto {
  @ApiProperty({ example: 2, minimum: 2, maximum: 50 })
  @IsInt()
  @Min(2)
  @Max(50)
  teamCount!: number;
  @ApiProperty({
    example: 5,
    minimum: 1,
    maximum: 50,
    description: 'Inclui o goleiro.',
  })
  @IsInt()
  @Min(1)
  @Max(50)
  playersPerTeam!: number;
  @ApiProperty({ example: false }) @IsBoolean() hasGoalkeepers!: boolean;
  @ApiProperty({ type: [DrawPlayerDto], maxItems: 500 })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => DrawPlayerDto)
  players!: DrawPlayerDto[];
}
