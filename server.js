const express = require('express');
const { chromium } = require('playwright');

const app = express();
const port = Number(process.env.PORT || 3000);
const apiKey = process.env.API_KEY || '';

app.use(express.json({ limit: '1mb' }));

function validarApiKey(req, res, next) {
  if (!apiKey) {
    return next();
  }

  const chaveRecebida = req.header('x-api-key');

  if (chaveRecebida !== apiKey) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Não autorizado'
    });
  }

  return next();
}

app.get('/', (req, res) => {
  res.json({
    sucesso: true,
    servico: 'API Nota Carioca',
    status: 'online'
  });
});

app.get('/health', (req, res) => {
  res.json({
    sucesso: true,
    status: 'healthy',
    data: new Date().toISOString()
  });
});

app.get('/teste-navegador', validarApiKey, async (req, res) => {
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage({
      viewport: {
        width: 1366,
        height: 768
      }
    });

    await page.goto(
      'https://notacarioca.rio.gov.br/gmaps/listaprestadores.aspx',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    const titulo = await page.title();
    const url = page.url();

    return res.json({
      sucesso: true,
      titulo,
      url,
      data: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`API executando na porta ${port}`);
});