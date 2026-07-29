const express = require('express');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
