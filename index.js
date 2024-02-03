const express = require('express');
const app = express();
const port = 3000;

// Rota para a página inicial
app.get('/', (req, res) => {
  res.send('Olá, mundo! Este é o meu primeiro servidor Node.js com Express.');
});

// Inicia o servidor na porta especificada
app.listen(port, () => {
  console.log(`Servidor está rodando em http://localhost:${port}`);
});
