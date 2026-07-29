const app = require('./src/app');
const { env } = require('./src/config/env');

app.listen(env.port, '0.0.0.0', () => {
  console.log(`API Nota Carioca executando na porta ${env.port}`);
});