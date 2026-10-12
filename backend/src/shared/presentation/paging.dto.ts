import { Type } from 'class-transformer';
import { IsInt, Min, Max, IsOptional, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export const IfDefined = () =>
  ValidateIf((_object: unknown, value: unknown) => value !== undefined);
export class PagingDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 1000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
