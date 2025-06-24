import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

import { Restaurant } from './src/entities/restaurant/restaurant.entity';
import { Menu } from './src/entities/menu/menu.entity';

dotenv.config();

console.log('DEBUG DB_HOST:', process.env.DB_HOST);
console.log('DEBUG DB_PORT:', process.env.DB_PORT);
console.log('DEBUG DB_USERNAME:', process.env.DB_USERNAME);
console.log('DEBUG DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DEBUG DB_NAME:', process.env.DB_NAME);



const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  entities: [Restaurant, Menu],

  synchronize: false,
  logging: true,
});

console.log([Restaurant, Menu]);

export default AppDataSource;