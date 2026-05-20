import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';

interface AuthedUser {
  id: string;
  role: string;
  email: string;
}

@Injectable()
export class HttpProxyService {
  private readonly logger = new Logger(HttpProxyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async forward(
    req: Request & { user?: AuthedUser },
    targetBaseUrl: string,
    targetPath: string,
    res: Response,
  ): Promise<void> {
    const correlationId = uuidv4();
    const method = req.method.toLowerCase() as
      | 'get'
      | 'post'
      | 'put'
      | 'patch'
      | 'delete';

    const url = `${targetBaseUrl}${targetPath}`;

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-correlation-id': correlationId,
    };

    if (req.user) {
      headers['x-user-id'] = req.user.id;
      headers['x-user-role'] = req.user.role;
    }

    // Forward query string
    const queryString = new URLSearchParams(
      req.query as Record<string, string>,
    ).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    this.logger.debug(`[${correlationId}] ${req.method} ${fullUrl}`);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url: fullUrl,
          headers,
          data: ['get', 'delete'].includes(method) ? undefined : req.body,
          validateStatus: () => true, // handle all status codes ourselves
        }),
      );

      res.status(response.status).json(response.data);
    } catch (err) {
      const axiosErr = err as AxiosError;

      if (axiosErr.code === 'ECONNREFUSED' || axiosErr.code === 'ENOTFOUND') {
        this.logger.error(
          `[${correlationId}] Upstream unreachable: ${fullUrl} — ${axiosErr.message}`,
        );
        throw new HttpException(
          'Upstream service unavailable',
          HttpStatus.BAD_GATEWAY,
        );
      }

      this.logger.error(
        `[${correlationId}] Proxy error: ${axiosErr.message}`,
      );
      throw new HttpException(
        'Proxy error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
