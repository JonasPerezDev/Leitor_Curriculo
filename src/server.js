/**
 * Resume Analyzer - Express Server
 * 
 * ✨ Built with GitHub Copilot AI Assistance
 * 
 * Main server entry point with:
 * - File upload handling (multer)
 * - Resume analysis routing (/api/analyze)
 * - Health check endpoint (/api/health)
 * - Error handling & logging
 */

// src/server.js
import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

import logger from "./logger.js";
import { validateFile } from "./fileValidator.js";
import { analyzeResume } from "./aiProvider.js";
import { mockResponse } from "./mockData.js";

// ── Paths ────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const PUBLIC_DIR = path.join(ROOT, "public");

await fs.mkdir(UPLOAD_DIR, { recursive: true });

// ── Express ──────────────────────────────────────────────────────────────────

const app = express();

// ── Body parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "100kb" }));
app.use(express.static(PUBLIC_DIR));

// ── Request ID middleware ─────────────────────────────────────────────────────
app.use((req, _res, next) => {
  req.requestId = req.headers["x-request-id"] || uuidv4();
  next();
});

// ── Multer — upload seguro ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    // Extrair extensão do arquivo original e salvar com UUID
    // Detecta extensão correta mesmo se client mandou errado
    let ext = path.extname(file.originalname).toLowerCase();
    
    // Se não tem extensão, detector por mime type
    if (!ext) {
      if (file.mimetype === "application/pdf") ext = ".pdf";
      else if (file.mimetype.startsWith("text")) ext = ".txt";
      else ext = ".pdf";
    }
    
    // Apenas .pdf e .txt aceitos
    if (![".pdf", ".txt"].includes(ext)) {
      ext = ".pdf"; // default
    }
    
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB (defesa em camadas)
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // Primeira barreira: MIME type declarado pelo cliente
    const ok = ["application/pdf", "text/plain", "application/octet-stream"];
    if (!ok.includes(file.mimetype)) {
      return cb(
        new multer.MulterError(
          "LIMIT_UNEXPECTED_FILE",
          "Tipo de arquivo inválido",
        ),
      );
    }
    cb(null, true);
  },
});

// ── Extrator de texto ────────────────────────────────────────────────────────

async function extractText(filePath, isPdf) {
  try {
    if (isPdf) {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    }
    // plain text
    return await fs.readFile(filePath, "utf-8");
  } catch (err) {
    if (isPdf) {
      throw new Error(`Falha ao extrair PDF: ${err.message}`);
    } else {
      throw new Error(`Falha ao ler arquivo TXT: ${err.message}`);
    }
  }
}

// ── Rota principal ───────────────────────────────────────────────────────────

app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  const { requestId } = req;
  const filePath = req.file?.path;

  try {
    // ── 1. Arquivo presente?
    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'Nenhum arquivo enviado. Campo: "resume".' });
    }

    logger.info(`Análise iniciada — arquivo: ${req.file.originalname}`, {
      requestId,
    });

    // ── 2. Validação por magic bytes
    const validation = await validateFile(
      filePath,
      req.file.mimetype,
      req.file.size,
    );

    if (!validation.valid) {
      return res.status(422).json({ errors: validation.errors });
    }

    logger.info(`Validação OK — isPdf: ${validation.isPdf}`, { requestId });

    const provider = (process.env.AI_PROVIDER || "cvparse").toLowerCase();
    let resumeText = null;

    // ── 3. Estratégia por tipo de arquivo
    // CVParse só aceita: pdf, docx, rtf, jpg, jpeg, png, tiff, tif, bmp, webp
    // TXT precisa ser extraído e processado com Anthropic/OpenAI
    
    const effectiveProvider = 
      provider === "cvparse" && !validation.isPdf 
        ? "anthropic"  // TXT não suporta CVParse, usar Anthropic
        : provider;

    if (effectiveProvider !== "cvparse") {
      resumeText = await extractText(filePath, validation.isPdf);

      if (!resumeText || resumeText.trim().length < 50) {
        return res.status(422).json({
          error:
            "Não foi possível extrair texto do arquivo. Verifique se o PDF não é uma imagem escaneada.",
        });
      }

      logger.info(`Texto extraído — ${resumeText.length} chars`, { requestId });
    }

    // ── 4. Análise por IA
    // IMPORTANTE: Passar filePath, isPdf, resumeText, requestId E effectiveProvider
    // CVParse usará filePath; Anthropic/OpenAI usarão resumeText
    const analysis = await analyzeResume(
      filePath,
      validation.isPdf,
      resumeText,
      requestId,
      effectiveProvider,
    );

    logger.info(`Análise concluída — score: ${analysis.score_geral}`, {
      requestId,
    });

    return res.json({
      requestId,
      analyzedAt: new Date().toISOString(),
      data: analysis,
    });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      logger.warn(`Multer error: ${err.message}`, { requestId });
      const messages = {
        LIMIT_FILE_SIZE: "Arquivo muito grande. Máximo permitido: 5 MB.",
        LIMIT_UNEXPECTED_FILE:
          'Campo de arquivo inválido. Use o campo "resume".',
      };
      return res.status(400).json({ error: messages[err.code] || err.message });
    }

    if (err.name === "SyntaxError" && err.message.includes("JSON")) {
      logger.error("IA retornou JSON inválido", { requestId, err });
      return res.status(502).json({
        error: "Falha ao processar resposta da IA. Tente novamente.",
      });
    }

    if (err.message && err.message.includes("JSON")) {
      logger.error("Erro de parsing JSON", { requestId, err: err.message });
      return res.status(502).json({
        error:
          err.message || "Falha ao processar resposta da IA. Tente novamente.",
      });
    }

    logger.error(`Erro interno: ${err.message}`, {
      requestId,
      stack: err.stack,
    });
    return res
      .status(500)
      .json({ error: "Erro interno. Tente novamente mais tarde." });
  } finally {
    // ── Sempre remove o arquivo temporário
    if (filePath) {
      await fs.unlink(filePath).catch(() => {
        logger.warn(`Falha ao deletar temp: ${filePath}`, { requestId });
      });
    }
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    provider: provider,
    env: process.env.NODE_ENV,
  });
});

// ── Mock endpoint (para testar frontend) ────────────────────────────────────
app.get("/api/mock", (_req, res) => {
  res.json(mockResponse);
});

// ── Serve frontend estático ───────────────────────────────────────────────────
app.use(express.static(PUBLIC_DIR));

// ── 404 para rotas desconhecidas de API ──────────────────────────────────────
app.use("/api/*", (_req, res) => {
  res.status(404).json({ error: "Rota não encontrada." });
});

// ── Fallback para SPA ─────────────────────────────────────────────────────────
app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const requestId = req.requestId || "unknown";
  logger.error(`Erro não tratado: ${err.message}`, {
    requestId,
    stack: err.stack,
  });
  res.status(500).json({ error: "Erro inesperado." });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`✅  Servidor rodando → http://localhost:${PORT}`);
  logger.info(`    Provedor IA  : ${process.env.AI_PROVIDER || "anthropic"}`);
  logger.info(`    Ambiente     : ${process.env.NODE_ENV || "development"}`);
});
