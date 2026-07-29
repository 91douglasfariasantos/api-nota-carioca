function notFound(req, res) {
  return res.status(404).json({
    sucesso: false,
    erro: 'Rota não encontrada'
  });
}

function errorHandler(error, req, res, next) {
  console.error(error);

  const status = Number(error.statusCode) || 500;

  return res.status(status).json({
    sucesso: false,
    erro: error.message || 'Erro interno do servidor',
    detalhes: error.detalhes,
    stack:
      process.env.NODE_ENV === 'production'
        ? undefined
        : error.stack
  });
}

module.exports = { notFound, errorHandler };
