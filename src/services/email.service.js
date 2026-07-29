const { normalizarUrl } = require('../utils/text');

async function buscarEmailNoSite(context, site) {
  const url = normalizarUrl(site);
  if (!url) return null;

  let paginaSite;

  try {
    paginaSite = await context.newPage();
    paginaSite.setDefaultTimeout(10000);
    paginaSite.setDefaultNavigationTimeout(15000);

    await paginaSite.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await paginaSite.waitForTimeout(800);

    return await paginaSite.evaluate(() => {
      const emails = new Set();

      document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
        const valor = String(link.getAttribute('href') || '')
          .replace(/^mailto:/i, '')
          .split('?')[0]
          .trim();

        if (valor) emails.add(valor);
      });

      const texto = String(document.body?.innerText || '');
      const encontrados =
        texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];

      encontrados.forEach((email) => emails.add(email));

      return Array.from(emails).find((email) => {
        const valor = email.toLowerCase();

        return (
          !valor.endsWith('.png') &&
          !valor.endsWith('.jpg') &&
          !valor.endsWith('.jpeg') &&
          !valor.endsWith('.webp') &&
          !valor.includes('example.com') &&
          !valor.includes('sentry.io')
        );
      }) || null;
    });
  } catch (error) {
    console.warn(`Falha ao buscar e-mail em ${url}: ${error.message}`);
    return null;
  } finally {
    if (paginaSite) {
      await paginaSite.close().catch(() => null);
    }
  }
}

async function enriquecerEmails(context, resultados, concorrencia = 3) {
  const saida = new Array(resultados.length);
  let indice = 0;

  async function trabalhador() {
    while (true) {
      const atual = indice++;
      if (atual >= resultados.length) return;

      const item = resultados[atual];
      const email =
        item.email ||
        (item.site
          ? await buscarEmailNoSite(context, item.site)
          : null);

      saida[atual] = { ...item, email };
    }
  }

  const quantidade = Math.min(concorrencia, resultados.length);

  await Promise.all(
    Array.from({ length: quantidade }, () => trabalhador())
  );

  return saida;
}

module.exports = { buscarEmailNoSite, enriquecerEmails };
