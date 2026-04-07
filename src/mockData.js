// Resposta mock para testar frontend
export const mockResponse = {
  requestId: "demo-12345",
  analyzedAt: new Date().toISOString(),
  data: {
    nome: "João Silva",
    score_geral: 87,
    nivel: "Sênior",
    cargo_objetivo: "Tech Lead / Arquiteto de Sistemas",
    contato: {
      email: "joao.silva@empresa.com",
      telefone: "(11) 98765-4321",
      cidade: "São Paulo, SP",
    },
    redes_sociais: {
      linkedin: "https://linkedin.com/in/joaosilva",
      github: "https://github.com/joaosilva",
      portfolio: "https://joaosilva.dev",
      outras: ["https://medium.com/@joaosilva"],
    },
    cargo_objetivo: "Tech Lead",
    linguagens_programacao: ["JavaScript", "TypeScript", "Python", "SQL"],
    frameworks_libs: ["React", "Node.js", "Express", "Next.js", "Vue.js"],
    banco_dados: ["PostgreSQL", "MongoDB", "Redis"],
    cloud_devops: ["AWS", "Docker", "Kubernetes", "GitHub Actions"],
    palavras_chave: ["Arquitetura", "Liderança", "Escalabilidade", "CI/CD"],
    experiencias: [
      {
        cargo: "Tech Lead",
        empresa: "TechCorp Brasil",
        periodo: "2020 - Presente",
        descricao:
          "Liderança de time de 8 desenvolvedores, arquitetura de microserviços",
      },
      {
        cargo: "Senior Developer",
        empresa: "StartupXYZ",
        periodo: "2018 - 2020",
        descricao: "Desenvolvimento full-stack, otimização de performance",
      },
    ],
    projetos: [
      {
        nome: "Dashboard Analytics",
        tecnologias: ["React", "Node.js", "PostgreSQL"],
        descricao: "Plataforma de análise em tempo real com 100k+ usuários",
      },
      {
        nome: "API Gateway",
        tecnologias: ["Kubernetes", "Docker", "Go"],
        descricao: "Sistema de roteamento de requisições com 99.99% uptime",
      },
    ],
    formacao: [
      {
        curso: "Bacharelado em Ciência da Computação",
        instituicao: "Universidade de São Paulo",
        periodo: "2014 - 2018",
        status: "Concluído",
      },
    ],
    idiomas: [
      { idioma: "Português", nivel: "Nativo" },
      { idioma: "Inglês", nivel: "Avançado" },
      { idioma: "Espanhol", nivel: "Intermediário" },
    ],
    pontos_fortes: [
      "Experiência em arquitetura de sistemas escaláveis",
      "Liderança de equipes multidisciplinares",
      "Expertise em DevOps e CI/CD",
      "Forte background em full-stack development",
    ],
    sugestoes_melhoria: [
      "Adicionar mais certificações (AWS, Kubernetes)",
      "Documentar mais projetos open-source",
      "Detalhar métricas de impacto nos projetos",
    ],
  },
};
