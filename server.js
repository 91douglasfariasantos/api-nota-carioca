const express = require('express');
const { chromium } = require('playwright');

const app = express();
const port = Number(process.env.PORT || 3000);
const apiKey = process.env.API_KEY || '';

const URL_NOTA_CARIOCA =
  'https://notacarioca.rio.gov.br/gmaps/listaprestadores.aspx';

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

async function criarNavegador() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  const context = await browser.newContext({
    viewport: {
      width: 1366,
      height: 900
    },
    locale: 'pt-BR',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 Chrome/130 Safari/537.36'
  });

  const page = await context.newPage();

  return {
    browser,
    context,
    page
  };
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
    const navegador = await criarNavegador();

    browser = navegador.browser;
    const page = navegador.page;

    await page.goto(URL_NOTA_CARIOCA, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(2000);

    return res.json({
      sucesso: true,
      titulo: await page.title(),
      url: page.url(),
      data: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro no teste:', error);

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

/**
 * Diagnóstico da estrutura da página.
 *
 * Retorna os campos, botões, selects e links encontrados.
 * Essa rota não realiza a coleta dos prestadores.
 */
app.get('/estrutura', validarApiKey, async (req, res) => {
  let browser;

  try {
    const navegador = await criarNavegador();

    browser = navegador.browser;
    const page = navegador.page;

    await page.goto(URL_NOTA_CARIOCA, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    const estrutura = await page.evaluate(() => {
      function textoLimpo(valor) {
        return String(valor || '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      const inputs = Array.from(
        document.querySelectorAll('input')
      ).map((elemento, indice) => ({
        indice,
        id: elemento.id || null,
        name: elemento.name || null,
        type: elemento.type || null,
        value: elemento.value || null,
        placeholder: elemento.placeholder || null,
        checked: Boolean(elemento.checked),
        textoProximo: textoLimpo(
          elemento.parentElement?.innerText
        ).slice(0, 200)
      }));

      const selects = Array.from(
        document.querySelectorAll('select')
      ).map((elemento, indice) => ({
        indice,
        id: elemento.id || null,
        name: elemento.name || null,
        value: elemento.value || null,
        opcoes: Array.from(elemento.options).map(opcao => ({
          texto: textoLimpo(opcao.textContent),
          value: opcao.value,
          selected: opcao.selected
        }))
      }));

      const buttons = Array.from(
        document.querySelectorAll(
          'button, input[type="button"], input[type="submit"], a'
        )
      )
        .map((elemento, indice) => ({
          indice,
          tag: elemento.tagName.toLowerCase(),
          id: elemento.id || null,
          name: elemento.name || null,
          type: elemento.type || null,
          value: elemento.value || null,
          texto: textoLimpo(
            elemento.innerText ||
            elemento.textContent ||
            elemento.value
          ),
          href: elemento.getAttribute('href'),
          onclick: elemento.getAttribute('onclick')
        }))
        .filter(item =>
          item.texto ||
          item.value ||
          item.href ||
          item.onclick
        );

      const tabelas = Array.from(
        document.querySelectorAll('table')
      ).map((tabela, indice) => ({
        indice,
        id: tabela.id || null,
        classe: tabela.className || null,
        linhas: tabela.querySelectorAll('tr').length,
        textoInicial: textoLimpo(tabela.innerText).slice(0, 500)
      }));

      return {
        titulo: document.title,
        inputs,
        selects,
        buttons,
        tabelas,
        textoPagina: textoLimpo(document.body.innerText).slice(0, 5000)
      };
    });

    return res.json({
      sucesso: true,
      url: page.url(),
      quantidadeInputs: estrutura.inputs.length,
      quantidadeSelects: estrutura.selects.length,
      quantidadeBotoesLinks: estrutura.buttons.length,
      quantidadeTabelas: estrutura.tabelas.length,
      estrutura
    });
  } catch (error) {
    console.error('Erro ao analisar estrutura:', error);

    return res.status(500).json({
      sucesso: false,
      erro: error.message,
      detalhe: error.stack
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    erro: 'Rota não encontrada'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`API executando na porta ${port}`);
});