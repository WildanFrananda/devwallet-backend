import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common"
import { FastifyReply, FastifyRequest } from "fastify"

interface ErrorResponseBody {
  statusCode: number
  error: string
  message: string | string[]
  path: string
  timestamp: string
}

@Catch()
class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const body: ErrorResponseBody = {
      statusCode: status,
      error: HttpStatus[status] ?? "Error",
      message: this.resolveMessage(exception, status),
      path: request.url,
      timestamp: new Date().toISOString()
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception)
      )
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status} ${JSON.stringify(body.message)}`)
    }

    void response.status(status).send(body)
  }

  private resolveMessage(exception: unknown, status: number): string | string[] {
    if (exception instanceof HttpException) {
      const res = exception.getResponse()
      if (typeof res === "string") return res
      if (res && typeof res === "object" && "message" in res) {
        const msg = (res).message
        if (typeof msg === "string" || Array.isArray(msg)) return msg
      }
      return exception.message
    }
    if (exception instanceof Error) {
      return status >= 500 ? "Internal server error" : exception.message
    }
    return "Internal server error"
  }
}

export default HttpExceptionFilter
