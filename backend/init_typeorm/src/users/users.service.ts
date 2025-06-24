import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findAll(): Promise<UserEntity[]> {
    return this.userRepo.find();
  }

  async create(userData: Partial<UserEntity>): Promise<UserEntity> {
    const newUser = this.userRepo.create(userData);
    return this.userRepo.save(newUser);
  }
}