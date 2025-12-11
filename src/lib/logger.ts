/**
 * Production-ready logging utility
 * Replaces console.log with environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (isProduction) {
      return level === 'warn' || level === 'error';
    }
    // In development, log everything
    return true;
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: unknown[]): void {
    // Always log errors, even in production
    console.error('[ERROR]', ...args);
    
    // In production, you might want to send errors to an error tracking service
    if (isProduction) {
      // TODO: Integrate with error tracking service (e.g., Sentry, LogRocket)
      // Example: errorTrackingService.captureException(new Error(args.join(' ')));
    }
  }

  // Safe error logging that doesn't expose sensitive information
  safeError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Don't log sensitive information
    const sanitizedMessage = this.sanitizeError(errorMessage);
    
    this.error(message, sanitizedMessage);
    
    if (isDevelopment && error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }

  // Sanitize error messages to remove sensitive data
  private sanitizeError(message: string): string {
    // Remove potential sensitive patterns
    return message
      .replace(/password[=:]\s*\S+/gi, 'password=***')
      .replace(/token[=:]\s*\S+/gi, 'token=***')
      .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=***')
      .replace(/secret[=:]\s*\S+/gi, 'secret=***')
      .replace(/authorization[=:]\s*\S+/gi, 'authorization=***');
  }
}

export const logger = new Logger();

