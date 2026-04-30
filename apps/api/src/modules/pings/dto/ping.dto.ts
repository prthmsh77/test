import { IsNumber, IsString, IsBoolean, IsOptional, IsISO8601, IsUUID, IsIn, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PingDto {
  @ApiProperty({ description: 'Trek UUID this ping belongs to' })
  @IsUUID() trekId: string;

  @ApiProperty({ description: 'ISO-8601 timestamp when this ping was recorded on-device' })
  @IsISO8601() recordedAt: string;

  @ApiProperty({ example: 32.2432 }) @IsNumber() lat: number;
  @ApiProperty({ example: 77.1956 }) @IsNumber() lng: number;

  @ApiPropertyOptional() @IsNumber() @IsOptional() altitudeMeters?: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() accuracyMeters?: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @Max(360) @IsOptional() headingDegrees?: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() speedMps?: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @Max(100) @IsOptional() batteryPercent?: number;

  @ApiPropertyOptional({ enum: ['WIFI', '4G', '3G', '2G', 'OFFLINE'] })
  @IsIn(['WIFI', '4G', '3G', '2G', 'OFFLINE']) @IsOptional() networkType?: string;

  @ApiProperty({ description: 'True when this ping was buffered offline then synced' })
  @IsBoolean() isOfflineBuffered: boolean;
}

export class BatchPingDto {
  @ApiProperty({ type: [PingDto], description: 'Up to 100 pings buffered offline then flushed on reconnect' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PingDto)
  pings: PingDto[];
}
