import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Menu } from '../menu/menu.entity';

export interface Location {
  lat: number;
  lng: number;
}

export interface Address {
  street: string;
  number: string;
  cityId: number;
  city?: string; 
  location: Location;
}

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null; 

  @Column({ type: 'jsonb', nullable: false })
  address: Address;

  @Column()
  imageUrl: string;

  @Column({ type: 'int', nullable: false })
  userId: number;

  @OneToMany(() => Menu, (menu) => menu.restaurant, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  menus: Menu[];
}