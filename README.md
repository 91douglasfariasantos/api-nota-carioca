# API Nota Carioca

API Node.js + Express + Playwright para consultar prestadores cadastrados na Nota Carioca.

## Rotas

- `GET /`
- `GET /health`
- `GET /categorias`
- `GET /teste-navegador`
- `POST /buscar`

As rotas protegidas usam o header:

```http
x-api-key: SUA_CHAVE
```

## Exemplo de busca

```json
{
  "bairro": "CENTRO",
  "limite": 10,
  "buscarEmails": false
}
```

Também é possível usar:

```json
{
  "categoria": "informática",
  "bairro": "CENTRO",
  "nome": "",
  "cnpj": "",
  "limite": 20,
  "buscarEmails": true
}
```

## Executar localmente

```bash
cp .env.example .env
npm install
npm start
```

## Docker

```bash
docker build -t api-nota-carioca .
docker run --rm -p 3000:3000 --env-file .env api-nota-carioca
```

## EasyPanel

1. Envie o projeto para o GitHub.
2. Crie um serviço usando o repositório.
3. Escolha implantação com Dockerfile.
4. Configure:
   - `PORT=3000`
   - `NODE_ENV=production`
   - `API_KEY=sua-chave`
5. Faça o deploy.

## n8n

Use o node HTTP Request:

- Método: `POST`
- URL: `https://seu-dominio/buscar`
- Header: `x-api-key`
- Body Content Type: JSON

Exemplo:

```json
{
  "bairro": "CENTRO",
  "limite": 10,
  "buscarEmails": false
}
```

## Observação

A busca de e-mails visita os sites encontrados e pode deixar a requisição mais lenta.
Para testes iniciais, use `"buscarEmails": false`.
