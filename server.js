const express = require('express');
const { chromium } = require('playwright');

const app = express();

const port = Number(process.env.PORT || 3000);
const apiKey = process.env.API_KEY || '';

const URL_NOTA_CARIOCA =
    'https://notacarioca.rio.gov.br/gmaps/listaprestadores.aspx';

const CATEGORIAS = {
    'agenciamento e corretagem': 'ctl00_cphCabMenu_lb01',
    'casa e decoração': 'ctl00_cphCabMenu_lb02',
    'comunicação e mercadologia': 'ctl00_cphCabMenu_lb03',
    'educação, esportes e lazer': 'ctl00_cphCabMenu_lb04',
    'engenharia, arquitetura e urbanismo': 'ctl00_cphCabMenu_lb05',
    'engenharia, arquiterura e urbanismo': 'ctl00_cphCabMenu_lb05',
    'escritório': 'ctl00_cphCabMenu_lb06',
    'higiene e apresentação pessoal': 'ctl00_cphCabMenu_lb07',
    'informática': 'ctl00_cphCabMenu_lb08',
    'jurídicos, econômicos e técnicos': 'ctl00_cphCabMenu_lb09',
    'limpeza e vigilância': 'ctl00_cphCabMenu_lb10',
    'saúde & veterinária': 'ctl00_cphCabMenu_lb11',
    'som, imagem e serviços gráficos': 'ctl00_cphCabMenu_lb12',
    'transportes e entregas': 'ctl00_cphCabMenu_lb13',
    'turismo, hospedagem e eventos': 'ctl00_cphCabMenu_lb14',
    'veículos': 'ctl00_cphCabMenu_lb15',
    'outros serviços': 'ctl00_cphCabMenu_lb16'
};

app.use(express.json({ limit: '1mb' }));

function normalizarTexto(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

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
        locale: 'pt-BR',
        viewport: {
            width: 1366,
            height: 900
        },
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 Chrome/130 Safari/537.36'
    });

    const page = await context.newPage();

    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);

    return {
        browser,
        context,
        page
    };
}

async function abrirNotaCarioca(page) {
    await page.goto(URL_NOTA_CARIOCA, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    await page.waitForTimeout(1500);
}

function obterIdCategoria(categoria) {
    const categoriaNormalizada = normalizarTexto(categoria);

    for (const [nome, id] of Object.entries(CATEGORIAS)) {
        if (normalizarTexto(nome) === categoriaNormalizada) {
            return id;
        }
    }

    return null;
}

app.get('/', (req, res) => {
    res.json({
        sucesso: true,
        servico: 'API Nota Carioca',
        versao: '2.0.0',
        status: 'online'
    });
});

app.get('/health', (req, res) => {
    res.json({
        sucesso: true,
        status: 'saudável',
        data: new Date().toISOString()
    });
});

app.get('/categorias', validarApiKey, (req, res) => {
    res.json({
        sucesso: true,
        categorias: Object.keys(CATEGORIAS)
    });
});

app.get('/teste-navegador', validarApiKey, async (req, res) => {
    let browser;

    try {
        const navegador = await criarNavegador();

        browser = navegador.browser;
        const page = navegador.page;

        await abrirNotaCarioca(page);

        return res.json({
            sucesso: true,
            titulo: await page.title(),
            url: page.url(),
            data: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro no teste do navegador:', error);

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

app.post('/buscar', validarApiKey, async (req, res) => {
    let browser;

    try {
        const {
            categoria = '',
            bairro = '',
            nome = '',
            cnpj = '',
            limite = 50
        } = req.body || {};

        const limiteSeguro = Math.min(
            Math.max(Number(limite) || 50, 1),
            200
        );

        if (!categoria && !bairro && !nome && !cnpj) {
            return res.status(400).json({
                sucesso: false,
                erro:
                    'Informe pelo menos um filtro: categoria, bairro, nome ou cnpj.'
            });
        }

        const navegador = await criarNavegador();

        browser = navegador.browser;
        const page = navegador.page;

        await abrirNotaCarioca(page);

        if (categoria) {
            const idCategoria = obterIdCategoria(categoria);

            if (!idCategoria) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Categoria não reconhecida.',
                    categoriasDisponiveis: Object.keys(CATEGORIAS)
                });
            }

            await Promise.all([
                page.waitForLoadState('domcontentloaded').catch(() => null),
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
            const campoNome = page.locator(
                '#ctl00_cphCabMenu_tbRazaoSocial'
            );

            await campoNome.fill('');
            await campoNome.fill(String(nome));
        }

        if (bairro) {
            const bairroNormalizado = String(bairro)
                .trim()
                .toUpperCase();

            await Promise.all([
                page.waitForNavigation({
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                }).catch(() => null),

                page
                    .locator('#ctl00_cphCabMenu_ddlBairros')
                    .selectOption({
                        value: bairroNormalizado
                    })
            ]);

            await page.waitForTimeout(1500);
        }

        await Promise.all([
            page.waitForNavigation({
                waitUntil: 'domcontentloaded',
                timeout: 60000
            }).catch(() => null),

            page.locator('#ctl00_cphCabMenu_lbConsultar').click()
        ]);

        await page.waitForLoadState('networkidle').catch(() => null);
        await page.waitForTimeout(3000);

        const diagnosticoPostback = await page.evaluate(() => {
            const botao = document.querySelector(
                '#ctl00_cphCabMenu_lbConsultar'
            );

            const bairro = document.querySelector(
                '#ctl00_cphCabMenu_ddlBairros'
            );

            const formulario = document.querySelector('form');

            const elementosPossiveisResultado = Array.from(
                document.querySelectorAll(
                    '[id*="grid" i], [id*="grd" i], [id*="result" i], ' +
                    '[id*="prestador" i], [id*="lista" i]'
                )
            ).map(elemento => ({
                tag: elemento.tagName,
                id: elemento.id || null,
                classe: elemento.className || null,
                texto: String(elemento.innerText || '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 500)
            }));

            return {
                bairroSelecionado: bairro?.value || null,
                bairroTexto:
                    bairro?.options?.[bairro.selectedIndex]?.text || null,

                botao: botao
                    ? {
                        tag: botao.tagName,
                        texto: botao.innerText?.trim() || null,
                        href: botao.getAttribute('href'),
                        onclick: botao.getAttribute('onclick')
                    }
                    : null,

                formulario: formulario
                    ? {
                        action: formulario.getAttribute('action'),
                        method: formulario.getAttribute('method')
                    }
                    : null,

                eventTarget:
                    document.querySelector('#__EVENTTARGET')?.value || null,

                quantidadeTabelas:
                    document.querySelectorAll('table').length,

                elementosPossiveisResultado
            };
        });

        // page.evaluate()

        const dados = await page.evaluate(({ limiteSeguro }) => {

            function limpar(valor) {
                return String(valor || '')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            const todasAsLinhas = Array.from(
                document.querySelectorAll('table tr')
            ).map((linha, indice) => {
                const celulas = Array.from(
                    linha.querySelectorAll('th, td')
                ).map(celula => limpar(celula.innerText));

                return {
                    indice,
                    celulas,
                    texto: limpar(linha.innerText)
                };
            });

            const regexDocumento =
                /(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})|(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2})/;

            const linhas = todasAsLinhas
                .filter(linha => regexDocumento.test(linha.texto))
                .map(linha => {
                    const documentoEncontrado =
                        linha.texto.match(regexDocumento)?.[0] || '';

                    const documentoNumerico =
                        documentoEncontrado.replace(/\D/g, '');

                    return {
                        indice: linha.indice,
                        documento: documentoEncontrado,
                        documentoNumerico,
                        tipoDocumento:
                            documentoNumerico.length === 14 ? 'CNPJ' : 'CPF',
                        celulas: linha.celulas,
                        texto: linha.texto
                    };
                })
                .filter(linha => linha.tipoDocumento === 'CNPJ')
                .slice(0, limiteSeguro);

            const tabelas = Array.from(
                document.querySelectorAll('table')
            )
                .map((tabela, indice) => ({
                    indice,
                    id: tabela.id || null,
                    classe: tabela.className || null,
                    quantidadeLinhas:
                        tabela.querySelectorAll('tr').length,
                    texto: limpar(tabela.innerText).slice(0, 1500)
                }))
                .filter(tabela => tabela.quantidadeLinhas > 1);

            const links = Array.from(
                document.querySelectorAll('a')
            )
                .map(link => ({
                    texto: limpar(link.innerText),
                    href: link.getAttribute('href')
                }))
                .filter(link => link.texto)
                .slice(0, 100);

            return {
                titulo: document.title,
                url: window.location.href,
                linhas,
                tabelas,
                links,
                textoPagina: limpar(document.body.innerText).slice(
                    0,
                    10000
                )
            };
        }, { limiteSeguro });

        return res.json({
            sucesso: true,
            filtros: {
                categoria,
                bairro,
                nome,
                cnpj
            },
            quantidadeLinhas: dados.linhas.length,
            resultados: dados.linhas,
            diagnostico: {
                titulo: dados.titulo,
                url: dados.url,
                postback: diagnosticoPostback,
                tabelas: dados.tabelas,
                links: dados.links,
                textoPagina: dados.textoPagina
            },
            data: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro na busca:', error);

        return res.status(500).json({
            sucesso: false,
            erro: error.message,
            detalhe:
                process.env.NODE_ENV === 'production'
                    ? undefined
                    : error.stack
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