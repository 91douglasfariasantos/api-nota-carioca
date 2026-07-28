# api-nota-carioca
# 🏙️ API Nota Carioca (Playwright + Node.js)

API desenvolvida em Node.js com Playwright para automatizar a raspagem e coleta pública de prestadores de serviços no portal da **Nota Carioca** (Prefeitura do Rio de Janeiro).

Projetada para rodar em ambiente Docker e ser orquestrada via **n8n** ou webhooks externos.

---

## 🏗️ Arquitetura do Sistema

## 📁 Estrutura do Projeto

```text
api-nota-carioca/
├── .dockerignore
├── Dockerfile
├── package.json
└── server.js

🛠️ Tecnologias UtilizadasNode.js (v20+)Express (v5) — Framework web levePlaywright (v1.62) — Automação e navegação headlessDocker — Containerização do ambienteEasyPanel — Deploy e hospedagem simplificada🔒 Variáveis de AmbienteCrie ou configure as seguintes variáveis no seu servidor/container:VariávelDescriçãoExemplo / PadrãoPORTPorta onde a aplicação rodará3000API_KEYChave de autenticação via header x-api-keynota-carioca-2026-douglas-8f72k91x⚠️ Segurança: Se a variável API_KEY não for informada, as rotas protegidas ficarão abertas. Em ambiente de produção, sempre defina uma chave forte.🚀 Como Executar LocalmenteUsando Node.js diretoInstale as dependências:
