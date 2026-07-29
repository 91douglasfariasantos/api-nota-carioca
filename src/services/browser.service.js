const { chromium } = require('playwright');
const { env } = require('../config/env');

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
    locale: 'pt-BR',
    viewport: { width: 1366, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 Chrome/130 Safari/537.36'
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);

  return { browser, context, page };
}

async function abrirNotaCarioca(page) {
  await page.goto(env.notaCariocaUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(1500);
}

module.exports = { criarNavegador, abrirNotaCarioca };
