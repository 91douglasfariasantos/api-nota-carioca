const { env } = require('../config/env');

function validarApiKey(req, res, next) {
  if (!env.apiKey) return next();

  const chaveRecebida = req.header('x-api-key');

  if (chaveRecebida !== env.apiKey) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Não autorizado'
    });
  }

  return next();
}

module.exports = { validarApiKey };
