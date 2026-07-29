const express = require('express');
const { validarApiKey } = require('../middlewares/auth');
const controller = require('../controllers/api.controller');

const router = express.Router();

router.get('/', controller.home);
router.get('/health', controller.health);
router.get('/categorias', validarApiKey, controller.categorias);
router.get(
  '/teste-navegador',
  validarApiKey,
  controller.testeNavegador
);
router.post('/buscar', validarApiKey, controller.buscar);

module.exports = router;
