export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors: string[];

  constructor(message: string, statusCode = 500, errors: string[] = [], isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors.length ? errors : [message];
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errors: string[] = []): AppError {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401, [message]);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 403, [message]);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(message, 404, [message]);
  }

  static conflict(message = 'Conflict', errors: string[] = []): AppError {
    return new AppError(message, 409, errors);
  }

  static tooManyRequests(message = 'Too many requests'): AppError {
    return new AppError(message, 429, [message]);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, [message], false);
  }

  static badGateway(message = 'Upstream service error'): AppError {
    return new AppError(message, 502, [message]);
  }

  static serviceUnavailable(message = 'Service unavailable'): AppError {
    return new AppError(message, 503, [message]);
  }
}
