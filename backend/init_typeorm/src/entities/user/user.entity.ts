import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ type: 'int' })
  cityId: number;
}