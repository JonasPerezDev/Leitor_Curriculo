/**
 * Resume Analyzer - File Validator Module
 * 
 * ✨ Built with GitHub Copilot AI Assistance
 * 
 * Security-focused validation:
 * - Magic bytes verification (not MIME type)
 * - PDF signature detection (%PDF)
 * - Text file validation
 * - File size enforcement
 */

// src/fileValidator.js
// Valida arquivos por magic bytes (não confia só no Content-Type do cliente).

import fs from "fs/promises";

// Magic bytes dos formatos aceitos
const SIGNATURES = {
  pdf: { bytes: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf" }, // %PDF
  txt: null, // plain text não tem magic bytes fixos — validado por conteúdo
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MIN_FILE_SIZE = 50; // bytes - arquivo muito pequeno provavelmente é inválido

export async function validateFile(filePath, originalMime, fileSize) {
  const errors = [];

  // 1. Tamanho mínimo
  if (fileSize < MIN_FILE_SIZE) {
    errors.push("Arquivo muito pequeno. Mínimo: 50 bytes");
  }

  // 2. Tamanho máximo
  if (fileSize > MAX_FILE_SIZE) {
    errors.push(
      `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
    );
  }

  // 3. Magic bytes — lê apenas os primeiros 8 bytes
  let header;
  try {
    const fd = await fs.open(filePath, "r");
    header = Buffer.alloc(8);
    await fd.read(header, 0, 8, 0);
    await fd.close();
  } catch (err) {
    errors.push(`Erro ao ler arquivo: ${err.message}`);
    return { valid: false, isPdf: false, errors };
  }

  const isPdf =
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46;

  // Plain text: todos os bytes devem ser imprimíveis / whitespace
  // Permitir mais caracteres comuns (quebras de linha, tabs, etc)
  const couldBeTxt = [...header].every(
    (b) => (b >= 0x20 && b <= 0x7e) || [0x09, 0x0a, 0x0d, 0x0c].includes(b),
  );

  if (!isPdf && !couldBeTxt) {
    errors.push("Formato de arquivo não reconhecido. Envie um PDF ou TXT.");
  }

  // 4. MIME declarado pelo cliente (defesa em profundidade)
  // Mais permissivo para files com octet-stream (alguns clientes enviam assim)
  const allowedMimes = [
    "application/pdf",
    "text/plain",
    "text/txt",
    "application/octet-stream",
  ];
  if (!allowedMimes.includes(originalMime)) {
    errors.push(`Tipo de conteúdo inválido: ${originalMime}`);
  }

  return {
    valid: errors.length === 0,
    isPdf,
    errors,
  };
}
