import {
  IsString, IsUUID, IsDateString, IsBoolean, IsOptional,
  IsInt, Min, Max, IsArray, IsEnum, Length, Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SosMode } from '@shikhar/shared';

export class CreateTrekDto {
  @ApiPropertyOptional({ description: 'Trail ID from the catalog (optional for custom routes)' })
  @IsUUID() @IsOptional() trailId?: string;

  @ApiProperty({ example: '2026-05-10T05:00:00Z' })
  @IsDateString() plannedStartAt: string;

  @ApiProperty({ example: '2026-05-10T18:00:00Z' })
  @IsDateString() plannedEndAt: string;

  @ApiPropertyOptional({ description: 'GeoJSON LineString of the declared route' })
  @IsOptional() routeGeoJson?: object;

  @ApiPropertyOptional() @IsInt() @Min(0) @Max(9000) @IsOptional() maxAltitudeMeters?: number;

  @ApiPropertyOptional() @IsInt() @Min(1) @Max(100) @IsOptional() groupSize?: number;

  @ApiProperty({ description: 'Emergency contact IDs to notify for this trek (min 1)' })
  @IsArray() @IsUUID('all', { each: true }) contactIds: string[];

  @ApiProperty({ description: 'User consents to auto-call ERSS-112 at L4 escalation' })
  @IsBoolean() erss112Consent: boolean;
}

export class StartTrekDto {
  @ApiProperty({ description: 'Trek UUID to start' })
  @IsUUID() trekId: string;
}

export class EndTrekDto {
  @ApiProperty({ description: 'Trek UUID to end' })
  @IsUUID() trekId: string;

  @ApiProperty({ description: 'User PIN (6 digits) for 2FA confirmation' })
  @IsString() @Length(6, 6) @Matches(/^\d{6}$/) pin: string;
}

export class ExtendTrekDto {
  @ApiProperty({ description: 'Trek UUID' })
  @IsUUID() trekId: string;

  @ApiProperty({ description: 'New planned end time (must be in the future)' })
  @IsDateString() newPlannedEndAt: string;
}

export class SosDto {
  @ApiProperty({ description: 'Trek UUID (must be ACTIVE)' })
  @IsUUID() trekId: string;

  @ApiProperty({ enum: SosMode })
  @IsEnum(SosMode) mode: SosMode;

  @ApiPropertyOptional({ description: 'Free-text description of the emergency' })
  @IsString() @IsOptional() description?: string;
}
