/**
 * Resume Analyzer - Logger Module
 * 
 * ✨ Built with GitHub Copilot AI Assistance
 * 
 * Winston-based logging configuration with:
 * - Structured logging (level, timestamp, requestId)
 * - Console output with colors
 * - File persistence (logs/error.log)
 * - Stack trace support
 */

// src/logger.js
import { createLogger, format, transports } from "winston";
import path from "path";
import fs from "fs/promises";

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp, requestId, stack }) => {
  const rid = requestId ? ` [${requestId}]` : "";
  return `${timestamp}${rid} ${level}: ${stack || message }`;
});

// Garantir que os diretórios de logs existem
const logsDir = path.resolve("logs");
try {
  await fs.mkdir(logsDir, { recursive: true });
} catch (err) {
  console.error("Erro ao criar diretório de logs:", err);
}

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    new transports.Console({
      format: combine(colorize(), logFormat),
    }),
    new transports.File({
      filename: path.resolve("logs/error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 3,
    }),
    new transports.File({
      filename: path.resolve("logs/combined.log"),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

export default logger;
