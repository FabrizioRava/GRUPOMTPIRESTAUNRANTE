import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { Restaurant } from './entities/restaurant/restaurant.entity';
import { Menu } from './entities/menu/menu.entity';


dotenv.config();

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/**/*.entity{.ts,.js}'], 
  synchronize: false, 
  logging: true, 
  migrationsRun: true, 
  migrationsTableName: 'migrations_history',
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  ssl: true,
  extra: {
    ssl: {
      rejectUnauthorized: false
    }
  },
  poolSize: 10,
  connectTimeoutMS: 3000,
  applicationName: 'your-app-name'
};

const dataSource = new DataSource(dataSourceOptions);

dataSource.initialize()
  .then(() => console.log('Conexión a la base de datos establecida'))
  .catch(error => console.error('Error de conexión:', error));

export default dataSource;