import { app } from 'electron';
import fs from 'fs';
import path from 'path';

class Logger {
  private logsDir: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.logsDir = path.join(userDataPath, 'logs');
    this.ensureLogsDir();
  }

  private ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return path.join(this.logsDir, `schoolab_log_${day}_${month}_${year}.txt`);
  }

  private formatMessage(level: 'INFO' | 'ERROR' | 'WARN', message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}\n`;
  }

  info(message: string) {
    this.appendToFile('INFO', message);
  }

  error(message: string, error?: any) {
    let fullMessage = message;
    if (error) {
      fullMessage += ` | Error: ${error.message || error}`;
      if (error.stack) fullMessage += `\nStack: ${error.stack}`;
    }
    this.appendToFile('ERROR', fullMessage);
  }

  warn(message: string) {
    this.appendToFile('WARN', message);
  }

  private appendToFile(level: 'INFO' | 'ERROR' | 'WARN', message: string) {
    try {
      const filePath = this.getLogFilePath();
      const formatted = this.formatMessage(level, message);
      fs.appendFileSync(filePath, formatted, 'utf8');
      console.log(formatted.trim());
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }
}

export const logger = new Logger();
