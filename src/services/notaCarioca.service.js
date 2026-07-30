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

        const celulasElementos = Array.from(
          linha.querySelectorAll('td')
        );

        const primeiraCelula = celulasElementos[0];
        const segundaCelula = celulasElementos[1];

        const tituloDocumento =
          primeiraCelula?.getAttribute('title') || '';

        const documento =
          tituloDocumento
            .match(
              /(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})|(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2})/
            )?.[0] || null;

        const bairroExtraido = limpar(
          segundaCelula?.innerText
        );

        const celulas = celulasElementos.map(
          (celula) => limpar(celula.innerText)
        );

        const links = Array.from(
          linha.querySelectorAll('a')
        ).map((link) => ({
          texto: limpar(link.innerText),
          href: link.getAttribute('href'),
          onclick: link.getAttribute('onclick'),
          title: link.getAttribute('title')
        }));

        const linkEmail = links.find((link) =>
          String(link.href || '')
            .toLowerCase()
            .startsWith('mailto:')
        );

        const linkSite = links.find((link) => {
          const href = String(link.href || '');
          const normalizado = href.toLowerCase();

          return (
            /^https?:\/\//i.test(href) &&
            !normalizado.includes('maps.google') &&
            !normalizado.includes('google.com/maps') &&
            !normalizado.includes('gmaps')
          );
        });

        const linkLocalizacao = linha.querySelector(
          '[id$="_hlLocalizacao"]'
        );

        const onclickLocalizacao =
          linkLocalizacao?.getAttribute('onclick') || '';

        const caminhoDetalhes =
          onclickLocalizacao.match(
            /window\.open\(['"]([^'"]+)/
          )?.[1] || null;

        const inscricao =
          caminhoDetalhes
            ?.match(/[?&]inscricao=(\d+)/i)?.[1] ||
          null;

        const detalhesUrl = caminhoDetalhes
          ? new URL(
            caminhoDetalhes,
            window.location.origin
          ).href
          : null;

        const textoCompleto = limpar(linha.innerText);
        const textoPrestador = limpar(
          campoPrestador.innerText
        );

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

        const nomeMascarado = limpar(
          campoPrestador.querySelector('b')?.innerText
        ) || null;

        const endereco = textoPrestador
          .replace(/^\*+\s*/, '')
          .trim();

        return {
          indice,
          nome: null,
          nomeMascarado,
          prestador: endereco,
          endereco,
          documento,
          cnpj: documento,
          bairro: bairroExtraido,
          cep,
          inscricao,
          detalhesUrl,
          site: linkSite?.href || null,
          email,
          mapa: detalhesUrl,
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

async function diagnosticarPrimeiraLinha(page) {
  return page.evaluate(() => {
    const linha = document.querySelector(
      '#ctl00_cphCabMenu_gvPrestadores tr:nth-child(2)'
    );

    if (!linha) {
      return {
        encontrada: false,
        mensagem: 'Nenhuma linha de resultado encontrada'
      };
    }

    return {
      encontrada: true,
      texto: linha.innerText,
      html: linha.innerHTML,
      elementos: Array.from(
        linha.querySelectorAll('*')
      ).map((elemento) => ({
        tag: elemento.tagName,
        id: elemento.id || null,
        classe:
          typeof elemento.className === 'string'
            ? elemento.className
            : null,
        texto: elemento.innerText?.trim() || '',
        href: elemento.getAttribute('href'),
        title: elemento.getAttribute('title')
      }))
    };
  });
}

module.exports = {
  obterIdCategoria,
  aplicarFiltros,
  consultarPrestadores,
  extrairPrestadores,
  diagnosticarPrimeiraLinha
};

