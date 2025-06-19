// src/entities/restaurant/restaurant.entity.ts
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
  city?: string; // Hacemos 'city' opcional aquí si es opcional en los DTOs
  location: Location;
}

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // CORRECCIÓN CLAVE 1:
  // Si 'description' puede ser null en la base de datos, su tipo en la entidad
  // debe reflejar eso para la compatibilidad con los DTOs y TypeORM.
  @Column({ type: 'text', nullable: true })
  description: string | null; // <-- CAMBIADO: Añadido '| null'

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