function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizarUrl(site) {
  if (!site) return null;

  let url = String(site).trim()
    .replace(/^http:\/\/https:\/\//i, 'https://')
    .replace(/^https:\/\/http:\/\//i, 'http://');

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return url;
}

module.exports = { normalizarTexto, normalizarUrl };
