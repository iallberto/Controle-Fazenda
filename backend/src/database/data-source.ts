import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';

// O schema evolui só por migrations, em todos os ambientes (spec 002, research R1).
// O synchronize fica desligado de propósito: ele pode apagar colunas quando uma
// entidade muda, e deixaria o banco de dev diferente do de produção.
//
// Este arquivo serve à CLI do TypeORM (npm run migration:*) e ao AppModule.
// A CLI roda sobre o código compilado em dist/, então os caminhos são relativos
// a este arquivo já compilado.
export function opcoesBanco(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: false,
  };
}

// Fora do Docker (CLI na máquina), as variáveis vêm do backend/.env
const arquivoEnv = join(__dirname, '..', '..', '.env');
if (!process.env.DB_HOST && existsSync(arquivoEnv)) {
  process.loadEnvFile(arquivoEnv);
}

export default new DataSource(opcoesBanco());
