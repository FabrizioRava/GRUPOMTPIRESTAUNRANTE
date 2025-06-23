import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { Restaurant } from '../restaurant/restaurant.entity';

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', comment: 'Descripción del ítem del menú' })
  description: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: 'Precio en formato decimal (ej: 1500.50)'
  })
  price: number;

  @Column({
    type: 'varchar', 
    comment: 'URL de la imagen del ítem del menú'
  })
  imageUrl: string; 

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.menus, {
    onDelete: 'CASCADE',
    nullable: false
  })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @Column({ type: 'int', nullable: false })
  @Index()
  restaurantId: number;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Categoría del ítem (ej: "Entradas", "Platos Principales")'
  })
  category: string | null; 
}