import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsIn, Matches } from 'class-validator';

class UpdateProfileDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() bio?: string;
  @IsIn(['en', 'hi', 'mr', 'bn', 'ta', 'kn', 'ml', 'te']) @IsOptional() preferredLanguage?: string;
}

class AddContactDto {
  @IsString() name: string;
  @Matches(/^\+91[6-9]\d{9}$/) phone: string;
  @IsString() relation: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  getMe(@CurrentUser() user: RequestUser) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile fields (name, bio, language)' })
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/emergency-contacts')
  @ApiOperation({ summary: 'List emergency contacts for the authenticated user' })
  getContacts(@CurrentUser() user: RequestUser) {
    return this.usersService.getEmergencyContacts(user.id);
  }

  @Post('me/emergency-contacts')
  @ApiOperation({ summary: 'Add an emergency contact (max 5 free, 10 Pro)' })
  addContact(@CurrentUser() user: RequestUser, @Body() dto: AddContactDto) {
    return this.usersService.addEmergencyContact(user.id, user.isPro, dto);
  }

  @Delete('me/emergency-contacts/:id')
  @ApiOperation({ summary: 'Remove an emergency contact' })
  removeContact(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.usersService.removeEmergencyContact(user.id, id);
  }
}
