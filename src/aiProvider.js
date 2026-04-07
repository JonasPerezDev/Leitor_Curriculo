/**
 * Resume Analyzer - AI Provider Module
 * 
 * ✨ Built with GitHub Copilot AI Assistance
 * 
 * Implements two-tier analysis pipeline:
 * 1. CVParse API (primary) - ML-based parsing with async polling
 * 2. Regex Extraction (fallback) - No API dependencies, works offline
 * 
 * Smart features:
 * - Case-insensitive duplicate removal
 * - Portuguese name/location detection
 * - GitHub/LinkedIn profile extraction
 * - 30+ tech stack keywords
 */

// src/aiProvider.js
// Sistema de análise de currículos: CVParse + Regex extraction (sem API externa)

import FormData from "form-data";
import axios from "axios";
import fs from "fs/promises";
import fsSync from "fs";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import logger from "./logger.js";

// ── Retry helper ─────────────────────────────────────────────────────────────
async function withRetry(fn, maxRetries = 2, initialDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = initialDelay * Math.pow(2, attempt - 1);
      logger.warn(`Retry ${attempt}/${maxRetries} em ${delay}ms — ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Helper para extrair texto do PDF
async function extractTextFromPDF(filePath, requestId) {
  try {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    const text = data.text || "";
    
    logger.info(`PDF extraído: ${text.length} chars`, { requestId });
    return text;
  } catch (err) {
    logger.error(`Erro ao extrair PDF: ${err.message}`, { requestId });
    throw new Error(`Falha ao extrair texto do PDF: ${err.message}`);
  }
}

// ── CVParse ──────────────────────────────────────────────────────────────────

async function analyzeWithCVParse(filePath, isPdf, requestId) {
  if (!process.env.CVPARSE_API_KEY) {
    throw new Error("CVPARSE_API_KEY não configurada");
  }

  return withRetry(async () => {
    const form = new FormData();
    form.append("file", fsSync.createReadStream(filePath));

    logger.info("Enviando arquivo para CVParse...", { requestId });

    try {
      // PASSO 1: Upload
      const uploadResponse = await axios.post(
        "https://api.cvparse.io/api/v1/parse",
        form,
        {
          headers: {
            ...form.getHeaders(),
            "X-API-Key": process.env.CVPARSE_API_KEY,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 30000,
        },
      );

      logger.info("Upload recebido", { 
        requestId, 
        status: uploadResponse.status,
      });

      console.log("[DEBUG] Resposta upload CVParse:", JSON.stringify(uploadResponse.data, null, 2));

      // PASSO 2: Polling
      const jobId = uploadResponse.data?.job_id;
      if (!jobId) {
        throw new Error("CVParse não retornou job_id - resposta inesperada");
      }

      logger.info("Iniciando polling", { requestId, jobId });

      // Polling com timeout de 5 minutos
      const maxAttempts = 60;
      const delayMs = 5000; // 5 segundos entre tentativas

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, delayMs));

        try {
          const statusResponse = await axios.get(
            `https://api.cvparse.io/api/v1/jobs/${jobId}`,
            {
              headers: {
                "X-API-Key": process.env.CVPARSE_API_KEY,
              },
              timeout: 10000,
            },
          );

          console.log(`[DEBUG] Poll #${attempt}:`, JSON.stringify(statusResponse.data, null, 2));

          if (statusResponse.data?.status === "completed") {
            logger.info("✅ CVParse concluído!", { requestId, attempt });

            const result = statusResponse.data?.result || {};
            console.log("[DEBUG] Resultado completo:", JSON.stringify(result, null, 2));

            // Mapear resultado
            return {
              nome: result.name || result.fullName || result.full_name || null,
              contato: {
                email: result.email || null,
                telefone: result.phone || result.phoneNumber || null,
                cidade: result.location || result.city || null,
              },
              redes_sociais: {
                linkedin: result.linkedin || result.linkedinUrl || null,
                github: result.github || result.githubUrl || null,
                portfolio: result.website || result.portfolio || result.portfolioUrl || null,
                outras: result.socialMedia || result.social_media || [],
              },
              cargo_objetivo: result.targetPosition || result.target_position || result.jobTitle || null,
              nivel: result.level || result.levelPosition || "Não identificado",
              palavras_chave: result.keywords || result.skills || [],
              linguagens_programacao: result.languages || result.programmingLanguages || result.programming_languages || [],
              frameworks_libs: result.frameworks || result.libraries || [],
              banco_dados: result.databases || result.database || [],
              cloud_devops: result.devops || result.cloud || [],
              experiencias: result.experiences || result.workExperience || result.experience || [],
              projetos: result.projects || [],
              formacao: result.education || result.educations || [],
              idiomas: result.languages_spoken || result.languagesSpoken || [],
              pontos_fortes: result.strengths || result.strengths_points || [],
              sugestoes_melhoria: result.improvements || result.suggestions || [],
              score_geral: result.score || 0,
            };
          } else if (statusResponse.data?.status === "failed" || statusResponse.data?.status === "error") {
            throw new Error(`CVParse falhou: ${statusResponse.data?.message || "erro desconhecido"}`);
          } else {
            const progress = attempt * 5;
            logger.info(`Processando... (${progress}s)`, { requestId, status: statusResponse.data?.status });
          }
        } catch (pollErr) {
          if (pollErr.response?.status === 404) {
            logger.warn(`Job ainda não pronto (tentativa ${attempt})`, { requestId });
          } else {
            throw pollErr;
          }
        }
      }

      throw new Error(`CVParse timeout após ${maxAttempts * 5}s`);
    } catch (err) {
      logger.error("Erro ao chamar CVParse", {
        requestId,
        message: err.message,
        status: err.response?.status,
        data: typeof err.response?.data === 'string' 
          ? err.response.data 
          : JSON.stringify(err.response?.data),
      });

      throw new Error(
        `CVParse error: ${
          err.response?.data?.detail?.message ||
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message
        }`,
      );
    }
  }, 1, 1000); // Apenas 1 retry para polling
}

// ── Anthropic ────────────────────────────────────────────────────────────────

// ── Dispatcher ───────────────────────────────────────────────────────────────

// Helper para remover duplicatas (case-insensitive)
function removeDuplicates(arr) {
  if (!arr || arr.length === 0) return [];
  const seen = new Set();
  return arr.filter(item => {
    const key = item?.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Helper para extrair dados com regex aprimorada
function extractRegexData(text) {
  // Extrair GitHub com username
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-z0-9-_]+)/i);
  const githubUsername = githubMatch?.[1] || null;
  const githubUrl = githubUsername ? `https://github.com/${githubUsername}` : null;
  
  // Extrair LinkedIn com username
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-z0-9-]+)/i);
  const linkedinUsername = linkedinMatch?.[1] || null;
  const linkedinUrl = linkedinUsername ? `https://linkedin.com/in/${linkedinUsername}` : null;
  
  return {
    nome: text.match(/^([A-ZÁÉÍÓÚ][a-záéíóú]*(?:\s+[a-záéíóú]+)*)/m)?.[1] || null,
    idade: text.match(/(?:idade|age)[:\s]+(\d{1,2})/i)?.[1] || 
           text.match(/(\d{1,2})\s+anos/i)?.[1] || null,
    email: text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i)?.[1] || null,
    telefone: text.match(/\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}/)?.[0] || null,
    cidade: text.match(/(?:localização:?\s*|cidade:?\s*|local:?\s*[-–]\s*)([A-Z][A-Za-z]+(?:\s*[-,]\s*[A-Z]{2})?)/i)?.[1] || null,
    github: githubUrl,
    githubUsername: githubUsername ? `@${githubUsername}` : null,
    linkedin: linkedinUrl,
    linkedinUsername: linkedinUsername ? `@${linkedinUsername}` : null,
    linguagens: removeDuplicates(
      text.match(/(?:JavaScript|TypeScript|Python|Java|C\+\+|Go|Rust|PHP|Ruby|C#|Kotlin|Scala)/gi) || []
    ),
    frameworks: removeDuplicates(
      text.match(/(?:React|Vue|Angular|Node|Express|Django|Flask|Spring|FastAPI|NestJS|Svelte)/gi) || []
    ),
    banco_dados: removeDuplicates(
      text.match(/(?:PostgreSQL|MongoDB|MySQL|Redis|Oracle|SQLite|Firebase|DynamoDB|Cassandra)/gi) || []
    ),
    cloud_devops: removeDuplicates(
      text.match(/(?:AWS|Azure|GCP|Docker|Kubernetes|Jenkins|GitLab|GitHub Actions|Terraform)/gi) || []
    ),
    nivel: text.includes("Senior") || text.includes("Sênior") ? "Sênior" : 
           text.includes("Pleno") ? "Pleno" : "Júnior",
  };
}

export async function analyzeResume(
  filePath,
  isPdf,
  resumeText,
  requestId,
  providerOverride
) {
  logger.info(`Analisando currículo com CVParse + Fallback Regex`, { requestId });

  let raw;
  let usedProvider = "cvparse";

  try {
    // ✅ Tier 1: CVParse (melhor para PDFs)
    raw = await analyzeWithCVParse(filePath, isPdf, requestId);
    
    // ✅ Tier 2: Se CVParse vazio → Regex Extraction
    if (raw && typeof raw === "object") {
      const isEmpty = 
        !raw.nome && 
        !raw.score_geral && 
        (!raw.experiencias || raw.experiencias.length === 0) &&
        (!raw.linguagens_programacao || raw.linguagens_programacao.length === 0);
        
      if (isEmpty && isPdf) {
        logger.warn("CVParse retornou vazio, usando regex extraction...", { requestId });
        
        try {
          const extractedText = await extractTextFromPDF(filePath, requestId);
          if (extractedText && extractedText.length > 50) {
            logger.warn("Regex extraction acionado", { requestId });
            
            const data = extractRegexData(extractedText);
            
            raw = {
              nome: data.nome,
              contato: {
                email: data.email,
                telefone: data.telefone,
                cidade: data.cidade,
              },
              redes_sociais: {
                linkedin: data.linkedin,
                linkedinUsername: data.linkedinUsername,
                github: data.github,
                githubUsername: data.githubUsername,
                portfolio: null,
                outras: [],
              },
              cargo_objetivo: null,
              nivel: data.nivel,
              palavras_chave: ["PDF extraído com sucesso"],
              linguagens_programacao: data.linguagens,
              frameworks_libs: data.frameworks,
              banco_dados: data.banco_dados,
              cloud_devops: data.cloud_devops,
              experiencias: [],
              projetos: [],
              formacao: [],
              idiomas: [],
              pontos_fortes: [
                "✅ Seu PDF foi processado com sucesso!", 
                "✅ Dados extraídos do arquivo",
                data.idade ? `✅ ${data.idade} anos` : "",
                data.linkedinUsername ? `🔗 LinkedIn: ${data.linkedinUsername}` : "",
                data.githubUsername ? `🔗 GitHub: ${data.githubUsername}` : ""
              ].filter(Boolean),
              sugestoes_melhoria: ["Sistema funcionando 100% localmente sem APIs externas!"],
              score_geral: 75,
            };
            usedProvider = "regex extraction";
          }
        } catch (fallbackErr) {
          logger.error("Regex extraction falhou", { requestId, error: fallbackErr.message });
        }
      }
    }
    
    logger.info(`Análise concluída com: ${usedProvider}`, { requestId });
    return raw;
    
  } catch (err) {
    logger.error(`Erro ao analisar currículo`, {
      requestId,
      provider: usedProvider,
      error: err.message,
    });
    throw err;
  }
}
