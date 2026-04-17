import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  dateOfBirth: true,
  gender: true,
  heightCm: true,
  weightKg: true,
  fitnessGoal: true,
  experienceLevel: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_PROFILE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    // Ensure the user exists
    const exists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('User not found');
    }

    const data: Prisma.UserUpdateInput = { ...dto };

    if (dto.dateOfBirth) {
      data.dateOfBirth = new Date(dto.dateOfBirth);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_PROFILE_SELECT,
    });
  }
}
