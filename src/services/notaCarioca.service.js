const { CATEGORIAS } = require('../config/categorias');
const { normalizarTexto } = require('../utils/text');

function obterIdCategoria(categoria) {
  const categoriaNormalizada = normalizarTexto(categoria);

  for (const [nome, id] of Object.entries(CATEGORIAS)) {
    if (normalizarTexto(nome) === categoriaNormalizada) {
      return id;
    }
  }

  return null;
}

async function aplicarFiltros(page, filtros) {
  const { categoria, bairro, nome, cnpj } = filtros;

  if (categoria) {
    const idCategoria = obterIdCategoria(categoria);

    if (!idCategoria) {
      const erro = new Error('Categoria não reconhecida.');
      erro.statusCode = 400;
      erro.detalhes = {
        categoriasDisponiveis: Object.keys(CATEGORIAS)
      };
      throw erro;
    }

    await Promise.all([
      page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }).catch(() => null),
      page.locator(`#${idCategoria}`).click()
    ]);

    await page.waitForTimeout(1500);
  }

  if (cnpj) {
    await page
      .locator('#ctl00_cphCabMenu_tbCPFCNPJ')
      .fill(String(cnpj));
  }

  if (nome) {
    await page
      .locator('#ctl00_cphCabMenu_tbRazaoSocial')
      .fill(String(nome));
  }

  if (bairro) {
    const bairroNormalizado = String(bairro).trim().toUpperCase();

    await Promise.all([
      page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }).catch(() => null),
      page
        .locator('#ctl00_cphCabMenu_ddlBairros')
        .selectOption({ value: bairroNormalizado })
    ]);

    await page.waitForTimeout(1500);
  }
}

async function consultarPrestadores(page) {
  await Promise.all([
    page.waitForNavigation({
      waitUntil: 'domcontentloaded',
      timeout: 60000
    }).catch(() => null),
    page.locator('#ctl00_cphCabMenu_lbConsultar').click()
  ]);

  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(3000);
}

async function extrairPrestadores(page, limiteSeguro) {
  return page.evaluate(({ limiteSeguro }) => {
    function limpar(valor) {
      return String(valor || '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const linhas = Array.from(
      document.querySelectorAll(
        '#ctl00_cphCabMenu_gvPrestadores tr'
      )
    )
      .map((linha, indice) => {
        const campoPrestador = linha.querySelector(
          '[id$="_lbPrestador"]'
        );

        if (!campoPrestador) return null;

        const celulas = Array.from(
          linha.querySelectorAll('td')
        ).map((celula) => limpar(celula.innerText));

        const links = Array.from(
          linha.querySelectorAll('a')
        ).map((link) => ({
          texto: limpar(link.innerText),
          href: link.getAttribute('href')
        }));

        const linkEmail = links.find((link) =>
          String(link.href || '')
            .toLowerCase()
            .startsWith('mailto:')
        );

        const linkMapa = links.find((link) => {
          const href = String(link.href || '').toLowerCase();
          return (
            href.includes('maps.google') ||
            href.includes('google.com/maps') ||
            href.includes('mapa') ||
            href.includes('gmaps')
          );
        });

        const linkSite = links.find((link) => {
          const href = String(link.href || '');
          const normalizado = href.toLowerCase();

          return (
            /^https?:\/\//i.test(href) &&
            !normalizado.includes('maps.google') &&
            !normalizado.includes('google.com/maps') &&
            !normalizado.includes('mapa') &&
            !normalizado.includes('gmaps')
          );
        });

        const textoCompleto = limpar(linha.innerText);
        const textoPrestador = limpar(campoPrestador.innerText);

        const emailNoTexto =
          textoCompleto.match(
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
          )?.[0] || null;

        const email =
          linkEmail?.href
            ?.replace(/^mailto:/i, '')
            .split('?')[0]
            .trim() ||
          emailNoTexto ||
          null;

        const cep =
          textoPrestador.match(
            /CEP:\s*(\d{5}-?\d{3})/i
          )?.[1]?.replace(/\D/g, '') || null;

        const documento =
          textoCompleto.match(
            /(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})|(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2})/
          )?.[0] || null;

        return {
          indice,
          prestador: textoPrestador,
          documento,
          cep,
          site: linkSite?.href || null,
          email,
          mapa: linkMapa?.href || null,
          celulas,
          texto: textoCompleto
        };
      })
      .filter(Boolean)
      .slice(0, limiteSeguro);

    return {
      titulo: document.title,
      url: window.location.href,
      linhas
    };
  }, { limiteSeguro });
}

module.exports = {
  obterIdCategoria,
  aplicarFiltros,
  consultarPrestadores,
  extrairPrestadores
};
