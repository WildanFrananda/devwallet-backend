import "reflect-metadata"
import { DataSource } from "typeorm"
import { config } from "dotenv"

config()

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: ["src/domain/entities/*.entity.ts"],
  migrations: ["src/infrastructure/database/migrations/*.ts"],
  synchronize: false,
  logging: process.env.NODE_ENV === "development"
})

export { AppDataSource }
