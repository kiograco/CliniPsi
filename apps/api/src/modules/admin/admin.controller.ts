import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AdminService } from './admin.service';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { ModerateReviewDto } from '../reviews/dto/moderate-review.dto';
import { ReviewsService } from '../reviews/reviews.service';
import { UpdatePsychologistApprovalDto } from './dto/update-psychologist-approval.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reviewsService: ReviewsService
  ) {}

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateUserStatus(id, dto);
  }

  @Get('psychologists/pending')
  listPendingPsychologists() {
    return this.adminService.listPendingPsychologists();
  }

  @Patch('psychologists/:id/approve')
  approvePsychologist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return this.adminService.approvePsychologist(user, id);
  }

  @Patch('psychologists/:id/reject')
  rejectPsychologist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePsychologistApprovalDto
  ) {
    return this.adminService.rejectPsychologist(user, id, dto);
  }

  @Get('appointments')
  listAppointments() {
    return this.adminService.listAppointments();
  }

  @Get('reviews/pending')
  listPendingReviews() {
    return this.reviewsService.listPending();
  }

  @Patch('reviews/:id/moderate')
  moderateReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto
  ) {
    return this.reviewsService.moderate(user, id, dto);
  }

  @Post('specialties')
  createSpecialty(@Body() dto: CreateTaxonomyDto) {
    return this.adminService.createSpecialty(dto);
  }

  @Patch('specialties/:id')
  updateSpecialty(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.adminService.updateSpecialty(id, dto);
  }

  @Post('approaches')
  createApproach(@Body() dto: CreateTaxonomyDto) {
    return this.adminService.createApproach(dto);
  }

  @Patch('approaches/:id')
  updateApproach(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.adminService.updateApproach(id, dto);
  }
}
