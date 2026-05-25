import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common"
import { FastifyReply, FastifyRequest } from "fastify"
import { Observable, tap } from "rxjs"

@Injectable()
class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP")

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp()
    const req = ctx.getRequest<FastifyRequest>()
    const res = ctx.getResponse<FastifyReply>()
    const startedAt = process.hrtime.bigint()

    return next.handle().pipe(
      tap({
        next: () => this.log(req, res, startedAt),
        error: () => this.log(req, res, startedAt)
      })
    )
  }

  private log(req: FastifyRequest, res: FastifyReply, startedAt: bigint): void {
    const durMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    this.logger.log(`${req.method} ${req.url} -> ${res.statusCode} ${durMs.toFixed(1)}ms`)
  }
}

export default LoggingInterceptor
