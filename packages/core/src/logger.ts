export interface Logger {
  log(...args: any[]): void
  info(...args: any[]): void
  error(...args: any[]): void
  warn(...args: any[]): void
}
export class Logger implements Logger {
  log(...args: any[]): void {
    console.log(...args)
  }
  info(...args: any[]): void {
    console.log(...args)
  }
  error(...args: any[]): void {
    console.error(...args)
  }
  warn(...args: any[]): void {
    console.warn(...args)
  }
}
