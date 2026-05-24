import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify"
import { ValidationPipe } from "@nestjs/common"
import { WsAdapter } from "@nestjs/platform-ws"
import HttpExceptionFilter from "./shared/filters/http-exception.filter"
import { LoggingInterceptor } from "./shared/interceptors/logging.interceptor"

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  )

  app.setGlobalPrefix("api/v1")
  app.useWebSocketAdapter(new WsAdapter(app))
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new LoggingInterceptor())

  await app.listen(process.env.PORT ?? 3000, "0.0.0.0")
}

void bootstrap()
