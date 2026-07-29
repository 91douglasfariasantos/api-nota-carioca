const env = {
  port: Number(process.env.PORT || 3000),
  apiKey: process.env.API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  notaCariocaUrl:
    process.env.NOTA_CARIOCA_URL ||
    'https://notacarioca.rio.gov.br/gmaps/listaprestadores.aspx'
};

module.exports = { env };
