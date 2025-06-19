// src/entities/menu/menu.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { Restaurant } from '../restaurant/restaurant.entity';

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // Obligatorio: no nullable: true aquí
  @Column({ type: 'text', comment: 'Descripción del ítem del menú' })
  description: string;

  // Obligatorio: no nullable: true aquí
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: 'Precio en formato decimal (ej: 1500.50)'
  })
  price: number;

  // Obligatorio: no nullable: true aquí, y especificamos el tipo para evitar inferencia a "Object"
  @Column({
    type: 'varchar', // Aseguramos que sea un VARCHAR/TEXT en la DB
    comment: 'URL de la imagen del ítem del menú'
  })
  imageUrl: string; // Tipo TS: solo string, no | null

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.menus, {
    onDelete: 'CASCADE',
    nullable: false
  })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @Column({ type: 'int', nullable: false })
  @Index()
  restaurantId: number;

  // Opcional: Este es el único que puede ser nulo en la DB
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Categoría del ítem (ej: "Entradas", "Platos Principales")'
  })
  category: string | null; // Tipo TS: string | null
}