import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';


import { Restaurant } from './src/entities/restaurant/restaurant.entity';
import { Menu } from './src/entities/menu/menu.entity';


dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // ✅ Usá directamente las clases
  entities: [Restaurant, Menu],

  // ⚠️ Asegurate de apuntar a dist para las migraciones compiladas
  migrations: ['dist/src/migrations/*.js'],
  synchronize: false,
  logging: true,
});

// 🔥 Esto fuerza a que TypeScript compile estos archivos
console.log([Restaurant, Menu]);

export default AppDataSource;

    