# Analisador de Currículo

> **Análise de currículo com IA e mecanismos inteligentes de fallback — Integração CVParse + extração baseada em regex**
>
> ✨ **Construído com GitHub Copilot** — Arquitetura de nível avançado projetada com assistência de IA
>
> 👨‍💻 **Desenvolvido por Jonas Perez** — Dev Front-End Junior

![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![Express](https://img.shields.io/badge/Express-4.19-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![AI-Built](https://img.shields.io/badge/Built%20with-GitHub%20Copilot%20AI-blue)

## Visão Geral

Serviço backend profissional para análise de currículos/CVs. Suporta processamento de arquivos PDF e TXT com análise em dois níveis:

1. **Principal**: API CVParse para análise precisa de currículos baseada em ML
2. **Fallback**: Extração baseada em regex com detecção inteligente de dados

### Recursos Principais

- ✅ **Suporte PDF & TXT** — Detecção automática de tipo de arquivo e processamento
- ✅ **Integração CVParse** — Polling de trabalho assíncrono com lógica de retry configurável
- ✅ **Fallback Inteligente** — Extração por regex quando análise primária indisponível
- ✅ **Zero Dependências de API** — Fallback funciona sem chaves de API externas
- ✅ **Extração de Dados** — Nome, email, telefone, localização, perfis LinkedIn/GitHub
- ✅ **Detecção de Stack de Tecnologia** — Linguagens, frameworks, bancos de dados, ferramentas cloud/DevOps
- ✅ **Saída Estruturada** — Resposta JSON com pontuação, avaliação de nível e sugestões
- ✅ **Pronto para Produção** — Tratamento de erros, logging, rate limiting

---

## Stack de Tecnologia

| Camada                | Tecnologia   |
| --------------------- | ------------ |
| **Runtime**           | Node.js 16+  |
| **Framework**         | Express.js   |
| **Parsing de PDF**    | pdf-parse    |
| **Cliente HTTP**      | axios        |
| **Upload de Arquivo** | multer       |
| **Logging**           | winston      |
| **Utilitários**       | uuid, dotenv |

---

## Início Rápido

### Pré-requisitos

- Node.js 16+
- npm ou yarn

### Instalação

```bash
# Clonar repositório
git clone https://github.com/JonasPerezDev/resume-analyzer.git
cd resume-analyzer

# Instalar dependências
npm install

# Configurar ambiente (opcional — extração por regex funciona sem chave de API)
cp .env.example .env

# Iniciar servidor de desenvolvimento
npm run dev
```

Servidor executado em `http://localhost:3000`

---

## Configuração

### Variáveis de Ambiente

Criar `.env` baseado em `.env.example`:

```env
# Servidor
NODE_ENV=development
PORT=3000

# API CVParse (opcional)
AI_PROVIDER=cvparse
CVPARSE_API_KEY=sua_chave_aqui
```

**Nota**: Sistema funciona sem `CVPARSE_API_KEY` — usa automaticamente fallback de extração by regex.

---

## Endpoints da API

### Upload e Análise

**POST** `/api/analyze`

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "file=@curriculo.pdf"
```

**Response (200 OK):**

```json
{
  "nome": "Jonas Perez",
  "contato": {
    "email": "jonas@example.com",
    "telefone": "(11) 12345-6789",
    "cidade": "São Paulo"
  },
  "redes_sociais": {
    "linkedin": "https://linkedin.com/in/jonas-perez-dev",
    "linkedinUsername": "@jonas-perez-dev",
    "github": "https://github.com/JonasPerezDev",
    "githubUsername": "@JonasPerezDev"
  },
  "nivel": "Sênior",
  "linguagens_programacao": ["JavaScript", "TypeScript", "Python", "Go", "PHP"],
  "frameworks_libs": ["React", "Express", "Django"],
  "banco_dados": ["PostgreSQL", "MongoDB", "MySQL"],
  "cloud_devops": ["AWS", "Docker", "Kubernetes"],
  "pontos_fortes": [
    "✅ Seu PDF foi processado com sucesso!",
    "✅ Dados extraídos do arquivo"
  ],
  "score_geral": 75
}
```

### Verificação de Saúde

**GET** `/api/health`

```bash
curl http://localhost:3000/api/health
```

---

## Como Funciona

### Pipeline de Processamento

```
Arquivo de Currículo
    ↓
[Validação]
    ↓
┌─────────────────────────────┐
│ Nível 1: API CVParse        │ ← Principal (se chave disponível)
│ • Upload de arquivo         │
│ • Polling de trabalho async │
│ • (padrão: 5 min)           │
└─────────────────────────────┘
    ↓
[Resultado vazio?]
    ↓ Sim
┌─────────────────────────────┐
│ Nível 2: Extração Regex     │ ← Fallback automático
│ • Extração de texto PDF     │
│ • Correspondência inteligente│
│ • Sem API necessária        │
└─────────────────────────────┘
    ↓
[Dados Estruturados]
    ↓
Renderizar no Frontend
```

### Capacidades de Extração

**Detecção baseada em regex:**

- Nomes em português com acentos (João, André, etc.)
- Validação de email (padrão similar a RFC)
- Formato de telefone brasileiro `(XX) 9XXXX-XXXX`
- Detecção de cidade + estado
- URLs de perfil LinkedIn/GitHub com @username
- 30+ linguagens de programação e frameworks
- Plataformas cloud e ferramentas DevOps
- Deduplicação de tech stack (case-insensitive)

---

## Estrutura de Arquivos

```
resume-analyzer/
├── public/
│   └── index.html           # SPA Frontend
├── src/
│   ├── server.js            # Setup Express & rotas
│   ├── aiProvider.js        # Lógica CVParse + extração regex
│   ├── fileValidator.js     # Validação de arquivo & magic bytes
│   └── logger.js            # Configuração Winston
├── .env.example             # Template de ambiente
├── .gitignore
├── package.json
└── README.md
```

---

## Desenvolvimento

### Iniciar Servidor de Dev

```bash
npm run dev
```

Auto-reinicia em mudanças de arquivo.

### Testes

**Interface Web:**

- Abra `http://localhost:3000`
- Faça upload de um currículo PDF ou TXT
- Visualize análise em tempo real

**Linha de Comando:**

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "file=@seu-curriculo.pdf"
```

### Logs

Logs detalhados em `logs/error.log`:

```bash
tail -f logs/error.log
```

---

## Performance

| Métrica                   | Valor     |
| ------------------------- | --------- |
| Análise Regex             | ~200ms    |
| Análise CVParse           | 2-30s     |
| Tamanho máximo de arquivo | 25MB      |
| Linha de base de memória  | ~50-100MB |

---

## Customização

### Adicionar Palavras-chave de Tecnologia

Edite `src/aiProvider.js` → `extractRegexData()`:

```javascript
linguagens: removeDuplicates(
  text.match(/(?:JavaScript|Python|Rust|Zig|Ada)/gi) || []
),
```

### Ajustar Timeout de Polling

```javascript
const maxAttempts = 120; // 10 minutos (padrão: 60 = 5 min)
```

### Alterar Porta

```bash
PORT=8080 npm run dev
```

---

## Deployment em Produção

### Ambiente

```env
NODE_ENV=production
PORT=3000
CVPARSE_API_KEY=sua_chave_producao
```

### Plataformas de Deploy

**Vercel:**

```bash
vercel --prod
```

**Heroku:**

```bash
git push heroku main
```

**Docker:**

```bash
docker build -t resume-analyzer .
docker run -p 3000:3000 -e CVPARSE_API_KEY=xxx resume-analyzer
```

---

## Tratamento de Erros

| Erro                          | Solução                                  |
| ----------------------------- | ---------------------------------------- |
| `Porta 3000 em uso`           | `PORT=3001 npm run dev`                  |
| `Arquivo muito grande`        | Máximo 25MB, verificar limites de upload |
| `Timeout do CVParse`          | Fallback regex lida automaticamente      |
| `Formato de arquivo inválido` | Faça upload de PDF ou TXT válido         |

---

## 🤖 Desenvolvido com GitHub Copilot AI

Este projeto foi arquitetado e implementado com a assistência do **GitHub Copilot**, demonstrando como a IA pode acelerar o desenvolvimento de nível avançado mantendo qualidade de código e melhores práticas.

**Componentes assistidos por IA:**

- Arquitetura de sistema com fallback em dois níveis
- Padrões de extração inteligentes com regex
- Estratégia de tratamento de erros e logging
- Estrutura de código pronto para produção

**Resultado:** Codebase profissional construído eficientemente sem sacrificar qualidade ou clareza.

---

## Contribuindo

```bash
git checkout -b feature/sua-funcionalidade
git commit -am 'Adicionar funcionalidade'
git push origin feature/sua-funcionalidade
```

Então abra um Pull Request.

---

## Licença

MIT © 2026 Jonas Perez

---

## Suporte

- 📧 Email: jonasperezdev@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/JonasPerezDev/resume-analyzer/issues)
- 💼 LinkedIn: [Jonas Perez Dev](https://linkedin.com/in/jonas-perez-dev)

---

**Feito com ❤️ por Jonas Perez** — Dev Front-End Junior
