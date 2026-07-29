const { CATEGORIAS } = require('../config/categorias');
const {
  criarNavegador,
  abrirNotaCarioca
} = require('../services/browser.service');
const {
  aplicarFiltros,
  consultarPrestadores,
  extrairPrestadores
} = require('../services/notaCarioca.service');
const {
  enriquecerEmails
} = require('../services/email.service');

function home(req, res) {
  return res.json({
    sucesso: true,
    servico: 'API Nota Carioca',
    versao: '3.0.0',
    status: 'online',
    rotas: {
      health: 'GET /health',
      categorias: 'GET /categorias',
      testeNavegador: 'GET /teste-navegador',
      buscar: 'POST /buscar'
    }
  });
}

function health(req, res) {
  return res.json({
    sucesso: true,
    status: 'saudável',
    data: new Date().toISOString()
  });
}

function categorias(req, res) {
  return res.json({
    sucesso: true,
    categorias: Object.keys(CATEGORIAS)
  });
}

async function testeNavegador(req, res, next) {
  let browser;

  try {
    const navegador = await criarNavegador();
    browser = navegador.browser;

    await abrirNotaCarioca(navegador.page);

    return res.json({
      sucesso: true,
      titulo: await navegador.page.title(),
      url: navegador.page.url(),
      data: new Date().toISOString()
    });
  } catch (error) {
    return next(error);
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }
}

async function buscar(req, res, next) {
  let browser;

  try {
    const {
      categoria = '',
      bairro = '',
      nome = '',
      cnpj = '',
      limite = 50,
      buscarEmails = true
    } = req.body || {};

    const limiteSeguro = Math.min(
      Math.max(Number(limite) || 50, 1),
      200
    );

    if (!categoria && !bairro && !nome && !cnpj) {
      const erro = new Error(
        'Informe pelo menos um filtro: categoria, bairro, nome ou cnpj.'
      );
      erro.statusCode = 400;
      throw erro;
    }

    const navegador = await criarNavegador();
    browser = navegador.browser;

    const { context, page } = navegador;

    await abrirNotaCarioca(page);
    await aplicarFiltros(page, {
      categoria,
      bairro,
      nome,
      cnpj
    });
    await consultarPrestadores(page);

    const dados = await extrairPrestadores(page, limiteSeguro);

    const resultados = buscarEmails
      ? await enriquecerEmails(context, dados.linhas, 3)
      : dados.linhas;

    return res.json({
      sucesso: true,
      filtros: {
        categoria,
        bairro,
        nome,
        cnpj,
        limite: limiteSeguro,
        buscarEmails: Boolean(buscarEmails)
      },
      quantidadeLinhas: resultados.length,
      resultados,
      pagina: {
        titulo: dados.titulo,
        url: dados.url
      },
      data: new Date().toISOString()
    });
  } catch (error) {
    return next(error);
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }
}

module.exports = {
  home,
  health,
  categorias,
  testeNavegador,
  buscar
};
