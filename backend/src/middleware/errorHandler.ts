import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handler middleware
 * Returns generic error responses to prevent information leakage
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  
  // Log error internally but return generic message
  console.error(`[Error] ${err.code || 'UNKNOWN'}: ${err.message}`);
  
  // Generic error response - never reveal internal details
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: statusCode === 500 
        ? 'An internal error occurred' 
        : err.message,
    },
  });
}

/**
 * Create an application error with status code
 */
export function createError(
  message: string,
  statusCode: number,
  code?: string
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
