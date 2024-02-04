const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const flash = require('express-flash');
const { createPool } = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');




const app = express();
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar o middleware para analisar dados do corpo da solicitação
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


let serverStatus = null;

const pool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 15,
  ssl: {
    rejectUnauthorized: true // Habilita SSL/TLS
  }
});

const localConnection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 15,
  ssl: {
    rejectUnauthorized: true // Habilita SSL/TLS
  }
});



app.use((req, res, next) => {
  req.pool = pool;
  next();
});


const sessionStore = new MySQLStore({
  expiration: 24 * 60 * 60 * 1000, // 24 horas em milissegundos
  endConnectionOnClose: false,
}, pool);


const connectToDatabase = async () => {
  const connection = await pool.getConnection();
  return connection;
};


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: new MySQLStore({}, pool),
  cookie: {
    secure: process.env.NODE_ENV === 'true', // Altere para true em produção
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));


app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      console.log("Tentativa de autenticação para o vendedor:", username);

      const [user] = await pool.query('SELECT * FROM vendedores WHERE username = ?', [username]);

      if (user.length === 0 || password !== user[0].password) {
        console.log("Falha na autenticação para o vendedor:", username);
        return done(null, false, { message: 'Usuário ou senha incorretos' });
      }

      console.log("Autenticação bem-sucedida para o vendedor:", username);
      return done(null, user[0]);
    } catch (err) {
      console.error("Erro na autenticação:", err);
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const connection = await connectToDatabase();
    const [rows] = await connection.query('SELECT id, username, password, nome FROM vendedores WHERE id = ?', [id]);
    connection.release();

    if (rows.length === 0) {
      return done(null, false, { message: 'Usuário não encontrado' });
    }
    const user = rows[0];
    done(null, user);
  } catch (err) {
    return done(err);
  }
});


async function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.use((req, res, next) => {
  if (req.path !== '/login' && req.path !== '/logout') {
    ensureAuthenticated(req, res, next);
  } else {
    next();
  }
});

app.get('/', (req, res) => {
  res.redirect('/login');
});



app.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash: true,
}), (req, res) => {
  // Esta função será chamada quando a autenticação for bem-sucedida.
  // Você pode retornar uma resposta JSON aqui se desejar.
  res.status(200).json({ message: 'Login bem-sucedido' });
});



app.get('/login', (req, res) => {
  res.render('login', { loginMessage: req.flash('error') });
  req.flash('error', ''); // Limpe as mensagens flash
});


app.get('/dashboard', ensureAuthenticated, async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const vendedorNome = req.user.nome;
      const localConnection = req.pool;
      
      

      // Defina a função formatDate
      function formatDate(date) {
        return date.toISOString().slice(0, 19).replace('T', ' ');
      }

      async function renderUserTable(res, user, users) {
        const limitedRows = users.slice(0, 4);
        const tableContent = limitedRows.map(row => ({
          username: row.username,
          data_expiracao: formatDate(row.data_expiracao),
          uuid: row.uuid ? '1/1' : '0/1',
        }));

// Contagem de logins na tabela usuariosandroid para o vendedor específico
let countRowsAndroid, countRowsUsuarios;

if (vendedorNome === 'adm') {
  // Se o vendedor for 'adm', conte todos os logins nas duas tabelas
  [countRowsAndroid] = await localConnection.query('SELECT COUNT(*) AS total FROM usuariosandroid');
  [countRowsUsuarios] = await localConnection.query('SELECT COUNT(*) AS total FROM usuarios');
} else {
  // Para outros vendedores, conte apenas os logins relacionados ao vendedor específico
  [countRowsAndroid] = await localConnection.query('SELECT COUNT(*) AS total FROM usuariosandroid WHERE vendedor_nome = ?', [vendedorNome]);
  [countRowsUsuarios] = await localConnection.query('SELECT COUNT(*) AS total FROM usuarios WHERE vendedor_nome = ?', [vendedorNome]);
}

user.numLogins1 = countRowsAndroid[0].total;
user.numLogins = countRowsUsuarios[0].total;


        res.render('dashboard', { creditsAmount, username: vendedorNome, errorMessage, user, tableContent, vendedorNome });
      }

      if (!localConnection) {
        console.error('Conexão local não definida');
        return res.status(500).send('Erro no servidor');
      }

      const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

      if (vendedorData.length === 0) {
        console.error('Vendedor não encontrado.');
        return res.status(500).send('Vendedor não encontrado.');
      }

      const creditsAmount = vendedorData[0].creditos;
      const errorMessage = req.flash('error');

      // Adiciona o código para buscar os usuários
      if (vendedorNome === 'adm') {
        // Se o vendedor for 'adm', permita que ele veja todos os logins
        const [countRowsAndroid] = await localConnection.query('SELECT * FROM usuariosandroid');
        const [countRowsUsuarios] = await localConnection.query('SELECT * FROM usuarios');

        // Crie o objeto user com as informações necessárias
        const user = {
          numLogins1: countRowsAndroid[0].total,
          numLogins: countRowsUsuarios[0].total,
        };

        renderUserTable(res, user, countRowsUsuarios);
      } else {
        // Caso contrário, continue com a verificação normal
        const [userRows] = await localConnection.query('SELECT * FROM usuarios WHERE vendedor_nome = ? ORDER BY data_expiracao DESC', [vendedorNome]);
        renderUserTable(res, userRows, userRows);
      }
    } catch (error) {
      console.error('Erro ao buscar créditos do vendedor:', error);
      res.status(500).send('Erro ao buscar créditos do vendedor.');
    }
  } else {
    req.flash('error', 'Você não está autenticado.');
    res.redirect('/login');
  }
});


app.get('/external', ensureAuthenticated, async (req, res) => {
  if (req.isAuthenticated()) {
  try {
    const vendedorNome = req.user.nome;
    const localConnection = req.pool;

    // Defina a função formatDate
    function formatDate(date) {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }

      // Função renderUserTable
      function renderUserTable(res, rows, user) {
        // Limite o número de usuários a serem exibidos (neste caso, 5)
        const limitedRows = rows.slice(0, 4);
        const tableContent = limitedRows.map(row => ({
          username: row.username,
          data_expiracao: formatDate(row.data_expiracao),
          uuid: row.uuid ? '1/1' : '0/1',
        }));

        // Adiciona a propriedade 'numLogins' e 'numVisits' ao objeto user
        user.numLogins = rows.length;


        res.render('external', { creditsAmount, username: vendedorNome, errorMessage, user, tableContent });
      }


      if (!localConnection) {
        console.error('Conexão local não definida');
        return res.status(500).send('Erro no servidor');
      }

      const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

      if (vendedorData.length === 0) {
        console.error('Vendedor não encontrado.');
        return res.status(500).send('Vendedor não encontrado.');
      }

      const creditsAmount = vendedorData[0].creditos;

      const errorMessage = req.flash('error');

      // Adiciona o código para buscar os usuários
      if (vendedorNome === 'adm') {
        // Se o vendedor for "MIKE IOS," permita que ele veja todos os logins
        const [rows] = await localConnection.query('SELECT * FROM usuariosexternal ORDER BY data_expiracao DESC');
        renderUserTable(res, rows, { vendedor_nome: vendedorNome, users: rows });
      } else {
        // Caso contrário, continue com a verificação normal
        const [userRows] = await localConnection.query('SELECT * FROM usuariosexternal WHERE vendedor_nome = ? ORDER BY data_expiracao DESC', [vendedorNome]);
        renderUserTable(res, userRows, { vendedor_nome: vendedorNome, users: userRows });
      }

    } catch (error) {
      console.error('Erro ao buscar créditos do vendedor:', error);
      res.status(500).send('Erro ao buscar créditos do vendedor.');
    }
  } else {
    req.flash('error', 'Você não está autenticado.');
    res.redirect('/login');
  }
});





app.get('/iphone', ensureAuthenticated, async (req, res) => {
  if (req.isAuthenticated()) {
  try {
    const vendedorNome = req.user.nome;
    const localConnection = req.pool;

    // Defina a função formatDate
    function formatDate(date) {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }

      // Função renderUserTable
      function renderUserTable(res, rows, user) {
        // Limite o número de usuários a serem exibidos (neste caso, 5)
        const limitedRows = rows.slice(0, 4);
        const tableContent = limitedRows.map(row => ({
          username: row.username,
          data_expiracao: formatDate(row.data_expiracao),
          uuid: row.uuid ? '1/1' : '0/1',
        }));

        // Adiciona a propriedade 'numLogins' e 'numVisits' ao objeto user
        user.numLogins = rows.length;


        res.render('iphone', { creditsAmount, username: vendedorNome, errorMessage, user, tableContent });
      }


      if (!localConnection) {
        console.error('Conexão local não definida');
        return res.status(500).send('Erro no servidor');
      }

      const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

      if (vendedorData.length === 0) {
        console.error('Vendedor não encontrado.');
        return res.status(500).send('Vendedor não encontrado.');
      }

      const creditsAmount = vendedorData[0].creditos;

      const errorMessage = req.flash('error');

      // Adiciona o código para buscar os usuários
      if (vendedorNome === 'adm') {
        // Se o vendedor for "MIKE IOS," permita que ele veja todos os logins
        const [rows] = await localConnection.query('SELECT * FROM usuarios ORDER BY data_expiracao DESC');
        renderUserTable(res, rows, { vendedor_nome: vendedorNome, users: rows });
      } else {
        // Caso contrário, continue com a verificação normal
        const [userRows] = await localConnection.query('SELECT * FROM usuarios WHERE vendedor_nome = ? ORDER BY data_expiracao DESC', [vendedorNome]);
        renderUserTable(res, userRows, { vendedor_nome: vendedorNome, users: userRows });
      }

    } catch (error) {
      console.error('Erro ao buscar créditos do vendedor:', error);
      res.status(500).send('Erro ao buscar créditos do vendedor.');
    }
  } else {
    req.flash('error', 'Você não está autenticado.');
    res.redirect('/login');
  }
});



app.get('/android', ensureAuthenticated, async (req, res) => {
  if (req.isAuthenticated()) {
  try {
    const vendedorNome = req.user.nome;
    const localConnection = req.pool;

    // Defina a função formatDate
    function formatDate(date) {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }

      // Função renderUserTable
      function renderUserTable(res, rows, user) {
        // Limite o número de usuários a serem exibidos (neste caso, 5)
        const limitedRows = rows.slice(0, 4);
        const tableContent = limitedRows.map(row => ({
          username: row.username,
          data_expiracao: formatDate(row.data_expiracao),
          uuid: row.uuid ? '1/1' : '0/1',
        }));

        // Adiciona a propriedade 'numLogins' e 'numVisits' ao objeto user
        user.numLogins = rows.length;


        res.render('android', { creditsAmount, username: vendedorNome, errorMessage, user, tableContent });
      }


      if (!localConnection) {
        console.error('Conexão local não definida');
        return res.status(500).send('Erro no servidor');
      }

      const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

      if (vendedorData.length === 0) {
        console.error('Vendedor não encontrado.');
        return res.status(500).send('Vendedor não encontrado.');
      }

      const creditsAmount = vendedorData[0].creditos;

      const errorMessage = req.flash('error');

      // Adiciona o código para buscar os usuários
      if (vendedorNome === 'adm') {
        // Se o vendedor for "MIKE IOS," permita que ele veja todos os logins
        const [rows] = await localConnection.query('SELECT * FROM usuariosandroid ORDER BY data_expiracao DESC');
        renderUserTable(res, rows, { vendedor_nome: vendedorNome, users: rows });
      } else {
        // Caso contrário, continue com a verificação normal
        const [userRows] = await localConnection.query('SELECT * FROM usuariosandroid WHERE vendedor_nome = ? ORDER BY data_expiracao DESC', [vendedorNome]);
        renderUserTable(res, userRows, { vendedor_nome: vendedorNome, users: userRows });
      }

    } catch (error) {
      console.error('Erro ao buscar créditos do vendedor:', error);
      res.status(500).send('Erro ao buscar créditos do vendedor.');
    }
  } else {
    req.flash('error', 'Você não está autenticado.');
    res.redirect('/login');
  }
});





app.get('/logout', (req, res) => {
  req.logout(function() {});
  res.redirect('/login');
});



app.get('/register', ensureAuthenticated, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }

    const loggedInVendor = req.user;
    const vendedorNome = req.user.nome;
    
        let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };

    let localConnection = req.pool; // Use a conexão da pool definida como req.pool

    if (!localConnection) {
      console.error('Conexão local não definida');
      return res.status(500).send('Erro no servidor');
    }

    const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

    if (vendedorData.length === 0) {
      // Vendedor não encontrado, lide com isso como apropriado
      return res.status(500).send('Vendedor não encontrado.');
    }

    const creditsAmount = vendedorData[0].creditos;

    const [vendors] = await localConnection.query('SELECT id, username FROM vendedores');

    res.render('register', { loggedInVendor, username: vendedorNome, vendors, creditsAmount, user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar vendedores no banco de dados');
  }
});





app.post('/add_user', async (req, res) => {
  try {
    const { username, password, expiration, currentDateTime } = req.body;
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado

    let localConnection; // Defina a variável localConnection aqui

    // Verifique se o vendedor é "MIKE IOS"
    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      // Se for "MIKE IOS", não é necessário verificar créditos ou deduzir
      const dataHoraAtual = new Date(currentDateTime);
      const dataExpiracao = new Date(dataHoraAtual);
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(expiration, 10));
      const dataExpiracaoFormatada = dataExpiracao.toISOString().slice(0, 19).replace('T', ' ');
      const [existingUsers] = await req.pool.query('SELECT * FROM usuarios WHERE username = ?', [username]);

      // Verifique se o usuário já existe
      if (existingUsers.length > 0) {
        console.log('Usuário já existe', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);
        return res.redirect('/register?existingLoginAlert=Usuário%20já%20existe');
      }

      localConnection = req.pool; // Use a conexão da pool definida como req.pool
      // Insira o usuário na tabela
      await localConnection.query('INSERT INTO usuarios (username, password, data_expiracao, vendedor_nome) VALUES (?, ?, ?, ?)', [username, password, dataExpiracaoFormatada, req.user.nome]);
      

      console.log('Usuário criado com sucesso', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);


      res.redirect('/register?successMessage=Usuário%20registrado%20com%20sucesso');
    } else {
      // Verifique se o vendedor possui créditos suficientes para criar um usuário
      const [vendedor] = await req.pool.query('SELECT * FROM vendedores WHERE nome = ?', [vendedorNome]);
      const creditosNecessarios = calcularCreditosNecessarios(expiration);

      if (vendedor.length === 0 || vendedor[0].creditos < creditosNecessarios) {
        console.log('----------------------------------------------------------------------------------------------------------------------------------------------------');
        console.log('Créditos insuficientes', '|', 'Vendedor:', req.user.nome);
        console.log('----------------------------------------------------------------------------------------------------------------------------------------------------');
        return res.redirect('/register?creditsAlert=Créditos%20insuficientes%20para%20registrar%20um%20usuário');
      }

      const [existingUsers] = await req.pool.query('SELECT * FROM usuarios WHERE username = ?', [username]);

if (existingUsers.length > 0) {
  console.log('Usuário já existe', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);
  console.log('----------------------------------------------------------------------------------------------------------------------------------------------------');
  return res.redirect('/register?existingLoginAlert=Usuário%20já%20existe');
}


      const dataHoraAtual = new Date(currentDateTime);
      const dataExpiracao = new Date(dataHoraAtual);
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(expiration, 10));
      const dataExpiracaoFormatada = dataExpiracao.toISOString().slice(0, 19).replace('T', ' ');

      // Deduza os créditos necessários do vendedor
      await req.pool.query('UPDATE vendedores SET creditos = creditos - ? WHERE nome = ?', [creditosNecessarios, vendedorNome]);

      // Insira o usuário na tabela
      await req.pool.query('INSERT INTO usuarios (username, password, data_expiracao, vendedor_nome) VALUES (?, ?, ?, ?)', [username, password, dataExpiracaoFormatada, req.user.nome]);
      

      console.log('Usuário criado com sucesso', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);


      res.redirect('/register?successMessage=Usuário%20registrado%20com%20sucesso');
    }
  } catch (err) {
    console.error(err);
    res.redirect('/register?errorMessage=Erro%20ao%20registrar%20usuário');
  }
});


app.get('/registerandroid', ensureAuthenticated, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }

    const loggedInVendor = req.user;
    const vendedorNome = req.user.nome;
    
        let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };

    let localConnection = req.pool; // Use a conexão da pool definida como req.pool

    if (!localConnection) {
      console.error('Conexão local não definida');
      return res.status(500).send('Erro no servidor');
    }

    const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

    if (vendedorData.length === 0) {
      // Vendedor não encontrado, lide com isso como apropriado
      return res.status(500).send('Vendedor não encontrado.');
    }

    const creditsAmount = vendedorData[0].creditos;

    const [vendors] = await localConnection.query('SELECT id, username FROM vendedores');

    res.render('registerandroid', { loggedInVendor, username: vendedorNome, vendors, creditsAmount, user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar vendedores no banco de dados');
  }
});





app.post('/add_userandroid', async (req, res) => {
  try {
    const { username, password, expiration, currentDateTime } = req.body;
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado

    let localConnection; // Defina a variável localConnection aqui

    // Verifique se o vendedor é "MIKE IOS"
    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      // Se for "MIKE IOS", não é necessário verificar créditos ou deduzir
      const dataHoraAtual = new Date(currentDateTime);
      const dataExpiracao = new Date(dataHoraAtual);
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(expiration, 10));
      const dataExpiracaoFormatada = dataExpiracao.toISOString().slice(0, 19).replace('T', ' ');
      const [existingUsers] = await req.pool.query('SELECT * FROM usuariosandroid WHERE username = ?', [username]);

      // Verifique se o usuário já existe
      if (existingUsers.length > 0) {
        console.log('Usuário já existe', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);
        return res.redirect('/registerandroid?existingLoginAlert=Usuário%20já%20existe');
      }

      localConnection = req.pool; // Use a conexão da pool definida como req.pool
      // Insira o usuário na tabela
      await localConnection.query('INSERT INTO usuariosandroid (username, password, data_expiracao, vendedor_nome) VALUES (?, ?, ?, ?)', [username, password, dataExpiracaoFormatada, req.user.nome]);
      

      console.log('Usuário criado com sucesso', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);


      res.redirect('/registerandroid?successMessage=Usuário%20registrado%20com%20sucesso');
    } else {
      // Verifique se o vendedor possui créditos suficientes para criar um usuário
      const [vendedor] = await req.pool.query('SELECT * FROM vendedores WHERE nome = ?', [vendedorNome]);
      const creditosNecessarios = calcularCreditosNecessarios(expiration);

      if (vendedor.length === 0 || vendedor[0].creditos < creditosNecessarios) {
        console.log('----------------------------------------------------------------------------------------------------------------------------------------------------');
        console.log('Créditos insuficientes', '|', 'Vendedor:', req.user.nome);
        console.log('----------------------------------------------------------------------------------------------------------------------------------------------------');
        return res.redirect('/registerandroid?creditsAlert=Créditos%20insuficientes%20para%20registrar%20um%20usuário');
      }

      const [existingUsers] = await req.pool.query('SELECT * FROM usuariosandroid WHERE username = ?', [username]);

if (existingUsers.length > 0) {
  console.log('Usuário já existe', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);
  console.log('----------------------------------------------------------------------------------------------------------------------------------------------------');
  return res.redirect('/registerandroid?existingLoginAlert=Usuário%20já%20existe');
}


      const dataHoraAtual = new Date(currentDateTime);
      const dataExpiracao = new Date(dataHoraAtual);
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(expiration, 10));
      const dataExpiracaoFormatada = dataExpiracao.toISOString().slice(0, 19).replace('T', ' ');

      // Deduza os créditos necessários do vendedor
      await req.pool.query('UPDATE vendedores SET creditos = creditos - ? WHERE nome = ?', [creditosNecessarios, vendedorNome]);

      // Insira o usuário na tabela
      await req.pool.query('INSERT INTO usuariosandroid (username, password, data_expiracao, vendedor_nome) VALUES (?, ?, ?, ?)', [username, password, dataExpiracaoFormatada, req.user.nome]);
      

      console.log('Usuário criado com sucesso', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);


      res.redirect('/registerandroid?successMessage=Usuário%20registrado%20com%20sucesso');
    }
  } catch (err) {
    console.error(err);
    res.redirect('/registerandroid?errorMessage=Erro%20ao%20registrar%20usuário');
  }
});


app.get('/registerexternal', ensureAuthenticated, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }

    const loggedInVendor = req.user;
    const vendedorNome = req.user.nome;
    
    let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };

    let localConnection = req.pool; // Use a conexão da pool definida como req.pool

    if (!localConnection) {
      console.error('Conexão local não definida');
      return res.status(500).send('Erro no servidor');
    }

    const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

    if (vendedorData.length === 0) {
      // Vendedor não encontrado, lide com isso como apropriado
      return res.status(500).send('Vendedor não encontrado.');
    }

    const creditsAmount = vendedorData[0].creditos;

    const [vendors] = await localConnection.query('SELECT id, username FROM vendedores');

    res.render('registerexternal', { loggedInVendor, username: vendedorNome, vendors, creditsAmount, user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar vendedores no banco de dados');
  }
});

app.post('/add_userexternal', async (req, res) => {
  try {
    const { username, password, expiration, currentDateTime } = req.body;
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado

    let localConnection; // Defina a variável localConnection aqui

    // Verifique se o vendedor é "MIKE IOS"
    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      // Se for "MIKE IOS", não é necessário verificar créditos ou deduzir
      const dataHoraAtual = new Date(currentDateTime);
      const dataExpiracao = new Date(dataHoraAtual);
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(expiration, 10));
      const dataExpiracaoFormatada = dataExpiracao.toISOString().slice(0, 19).replace('T', ' ');
      const [existingUsers] = await req.pool.query('SELECT * FROM usuariosexternal WHERE username = ?', [username]);

      // Verifique se o usuário já existe
      if (existingUsers.length > 0) {
        console.log('Usuário já existe', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);
        return res.redirect('/registerexternal?existingLoginAlert=Usuário%20já%20existe');
      }

      localConnection = req.pool; // Use a conexão da pool definida como req.pool
      // Insira o usuário na tabela
      await localConnection.query('INSERT INTO usuariosexternal (username, password, data_expiracao, vendedor_nome) VALUES (?, ?, ?, ?)', [username, password, dataExpiracaoFormatada, req.user.nome]);

      console.log('Usuário criado com sucesso', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);

      res.redirect('/registerexternal?successMessage=Usuário%20registrado%20com%20sucesso');
    } else {
      // Verifique se o vendedor possui créditos suficientes para criar um usuário
      const [vendedor] = await req.pool.query('SELECT * FROM vendedores WHERE nome = ?', [vendedorNome]);
      const creditosNecessarios = calcularCreditosNecessarios(expiration);

      if (vendedor.length === 0 || vendedor[0].creditos < creditosNecessarios) {
        console.log('----------------------------------------------------------------------------------------------------------------------------------------------------');
        console.log('Créditos insuficientes', '|', 'Vendedor:', req.user.nome);
        console.log('----------------------------------------------------------------------------------------------------------------------------------------------------');
        return res.redirect('/registerexternal?creditsAlert=Créditos%20insuficientes%20para%20registrar%20um%20usuário');
      }

      const [existingUsers] = await req.pool.query('SELECT * FROM usuariosexternal WHERE username = ?', [username]);

      if (existingUsers.length > 0) {
        console.log('Usuário já existe', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);
        console.log('----------------------------------------------------------------------------------------------------------------------------------------------------');
        return res.redirect('/registerexternal?existingLoginAlert=Usuário%20já%20existe');
      }

      const dataHoraAtual = new Date(currentDateTime);
      const dataExpiracao = new Date(dataHoraAtual);
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(expiration, 10));
      const dataExpiracaoFormatada = dataExpiracao.toISOString().slice(0, 19).replace('T', ' ');

      // Deduza os créditos necessários do vendedor
      await req.pool.query('UPDATE vendedores SET creditos = creditos - ? WHERE nome = ?', [creditosNecessarios, vendedorNome]);

      // Insira o usuário na tabela
      await req.pool.query('INSERT INTO usuariosexternal (username, password, data_expiracao, vendedor_nome) VALUES (?, ?, ?, ?)', [username, password, dataExpiracaoFormatada, req.user.nome]);

      console.log('Usuário criado com sucesso', '|', 'Vendedor:', req.user.nome, '|', 'Usuário:', username, '|', 'Senha:', password, '|', 'Validade:', expiration);

      res.redirect('/registerexternal?successMessage=Usuário%20registrado%20com%20sucesso');
    }
  } catch (err) {
    console.error(err);
    res.redirect('/registerexternal?errorMessage=Erro%20ao%20registrar%20usuário');
  }
});










// Função para calcular os créditos necessários com base na duração da conta
function calcularCreditosNecessarios(expiration) {
  const duracaoEmDias = parseInt(expiration, 10);
  
  if (duracaoEmDias === 30) {
    // Créditos necessários para 30 dias
    return 2;
  } else if (duracaoEmDias === 15) {
    // Créditos necessários para 15 dias
    return 1;
  } else if (duracaoEmDias === 365) {
    // Créditos necessários para 1 ano
    return 5;
  } else if (duracaoEmDias === 3650) {
    // Créditos necessários para 1 ano
    return 10;
  }

  return 0; // Caso não corresponda a nenhuma duração válida
}

app.get('/get_credits', async (req, res) => {
  try {
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado
    // Realize uma consulta para buscar os créditos do vendedor com base em seu nome
    const [vendedor] = await connection.query('SELECT credits FROM vendedores WHERE nome = ?', [vendedorNome]);
    
    // Verifique se o vendedor foi encontrado
    if (vendedor.length > 0) {
      // Envie os créditos do vendedor em formato JSON
      res.json({ creditsAmount: vendedor[0].credits });
    } else {
      // Se o vendedor não for encontrado, envie uma resposta vazia ou um erro
      res.json({ creditsAmount: 0 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ creditsAmount: 0 });
  }
});


app.get('/remove', async (req, res) => {
  if (req.isAuthenticated()) {
    // Supondo que você esteja usando um mecanismo para autenticar os vendedores e o nome do vendedor esteja disponível em req.user.nome

    // Recupere a quantidade de créditos do vendedor a partir do banco de dados
    try {
      const vendedorNome = req.user.nome;
      const localConnection = req.pool; // Use a conexão da pool definida como req.pool
      
                    let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };


      if (!localConnection) {
        console.error('Conexão local não definida');
        return res.status(500).send('Erro no servidor');
      }

      const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

      if (vendedorData.length === 0) {
        // Vendedor não encontrado, lide com isso como apropriado
        return res.status(500).send('Vendedor não encontrado.');
      }

      const creditsAmount = vendedorData[0].creditos;

      // Renderize o arquivo EJS e passe os dados do vendedor
      res.render('remove_user', { creditsAmount, username: vendedorNome, user });
    } catch (error) {
      console.error('Erro ao buscar créditos do vendedor:', error);
      res.status(500).send('Erro ao buscar créditos do vendedor.');
    }
  } else {
    res.redirect('/login');
  }
});


app.post('/remove_user', async (req, res) => {
  try {
    const { username } = req.body;
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado

    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      if (username !== 'MIKE IOS' || vendedorNome === 'RAFA IOS') {
        // Verifique se o nome de usuário a ser removido não é "MIKE IOS"
        const localConnection = req.pool; // Use a conexão da pool definida como req.pool

        if (!localConnection) {
          console.error('Conexão local não definida');
          return res.status(500).send('Erro no servidor');
        }

        const [existingUser] = await localConnection.query('SELECT vendedor_nome FROM usuarios WHERE username = ?', [username]);

        if (existingUser.length > 0) {
          // Se o usuário existir, remova-o da tabela de usuários
          await localConnection.query('DELETE FROM usuarios WHERE username = ?', [username]);
          console.log('Vendedor:', req.user.nome, 'removeu o usuário', 'Usuário:', username);
          return res.redirect('/remove?successAlert=Usuário%20removido%20com%20sucesso&successMessage=Usuário%20removido%20com%20sucesso');
        } else {
          // Caso contrário, verifique se o nome de usuário é um vendedor
          const [existingVendedor] = await localConnection.query('SELECT * FROM vendedores WHERE username = ?', [username]);

          if (existingVendedor.length > 0) {
            // Se for um vendedor, remova-o da tabela de vendedores
            await localConnection.query('DELETE FROM vendedores WHERE username = ?', [username]);
            console.log('Vendedor:', req.user.nome, 'removeu o usuário', 'Usuário:', username);
            return res.redirect('/remove?SuccessAlertVendedor=Vendedor%20removido%20com%20sucesso&successMessage=Vendedor%20removido%20com%20sucesso');
          }
        }
      }
    }

    // Se o vendedor não for "MIKE IOS" ou se a ação não for bem-sucedida, redirecione para uma página de erro
    // Aqui, retornamos às ações normais para outros vendedores
    // Adicione ou modifique esta parte conforme suas necessidades
    const localConnection = req.pool; // Use a conexão da pool definida como req.pool

    if (!localConnection) {
      console.error('Conexão local não definida');
      return res.status(500).send('Erro no servidor');
    }

    const [existingUser] = await localConnection.query('SELECT vendedor_nome FROM usuarios WHERE username = ?', [username]);

    if (existingUser.length === 0) {
      console.log('Vendedor:', req.user.nome, 'tentou remover o usuário', 'Usuário:', username, 'mas não existe');
      return res.redirect('/remove?nonexistentLoginAlert=Login%20não%20encontrado.%20Por%20favor,%20verifique%20seu%20nome%20de%20usuário.');
    }

    if (existingUser[0].vendedor_nome !== vendedorNome) {
      console.log('Vendedor:', req.user.nome, 'tentou remover o usuário', 'Usuário:', username, 'mas não é possivel remover logins de outros vendedores');
      return res.redirect('/remove?errorRemoveAlert=Não%20é%20possível%20remover%20logins%20de%20outros%20vendedores.%20Por%20favor,%20verifique%20o%20nome%20de%20usuário.');
    }

    await localConnection.query('DELETE FROM usuarios WHERE username = ? AND vendedor_nome = ?', [username, vendedorNome]);
    console.log('Vendedor:', req.user.nome, 'removeu o usuário', 'Usuário:', username);
    return res.redirect('/remove?successMessage=Usuário%20removido%20com%20sucesso');
  } catch (err) {
    console.error(err);
    res.redirect('/remove?errorMessage=Erro%20ao%20remover%20usuário');
  }
});


app.get('/removeandroid', async (req, res) => {
  if (req.isAuthenticated()) {
    // Supondo que você esteja usando um mecanismo para autenticar os vendedores e o nome do vendedor esteja disponível em req.user.nome

    // Recupere a quantidade de créditos do vendedor a partir do banco de dados
    try {
      const vendedorNome = req.user.nome;
      const localConnection = req.pool; // Use a conexão da pool definida como req.pool
      
                    let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };


      if (!localConnection) {
        console.error('Conexão local não definida');
        return res.status(500).send('Erro no servidor');
      }

      const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

      if (vendedorData.length === 0) {
        // Vendedor não encontrado, lide com isso como apropriado
        return res.status(500).send('Vendedor não encontrado.');
      }

      const creditsAmount = vendedorData[0].creditos;

      // Renderize o arquivo EJS e passe os dados do vendedor
      res.render('remove_userandroid', { creditsAmount, username: vendedorNome, user });
    } catch (error) {
      console.error('Erro ao buscar créditos do vendedor:', error);
      res.status(500).send('Erro ao buscar créditos do vendedor.');
    }
  } else {
    res.redirect('/login');
  }
});

app.post('/remove_userandroid', async (req, res) => {
  try {
    const { username } = req.body;
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado

    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      if (username !== 'MIKE IOS' || vendedorNome === 'RAFA IOS') {
        // Verifique se o nome de usuário a ser removido não é "MIKE IOS"
        const localConnection = req.pool; // Use a conexão da pool definida como req.pool

        if (!localConnection) {
          console.error('Conexão local não definida');
          return res.status(500).send('Erro no servidor');
        }

        const [existingUser] = await localConnection.query('SELECT vendedor_nome FROM usuariosandroid WHERE username = ?', [username]);

        if (existingUser.length > 0) {
          // Se o usuário existir, remova-o da tabela de usuários
          await localConnection.query('DELETE FROM usuariosandroid WHERE username = ?', [username]);
          console.log('Vendedor:', req.user.nome, 'removeu o usuário', 'Usuário:', username);
          return res.redirect('/removeandroid?successAlert=Usuário%20removido%20com%20sucesso&successMessage=Usuário%20removido%20com%20sucesso');
        } else {
          // Caso contrário, verifique se o nome de usuário é um vendedor
          const [existingVendedor] = await localConnection.query('SELECT * FROM vendedores WHERE username = ?', [username]);

          if (existingVendedor.length > 0) {
            // Se for um vendedor, remova-o da tabela de vendedores
            await localConnection.query('DELETE FROM vendedores WHERE username = ?', [username]);
            console.log('Vendedor:', req.user.nome, 'removeu o usuário', 'Usuário:', username);
            return res.redirect('/removeandroid?SuccessAlertVendedor=Vendedor%20removido%20com%20sucesso&successMessage=Vendedor%20removido%20com%20sucesso');
          }
        }
      }
    }

    // Se o vendedor não for "MIKE IOS" ou se a ação não for bem-sucedida, redirecione para uma página de erro
    // Aqui, retornamos às ações normais para outros vendedores
    // Adicione ou modifique esta parte conforme suas necessidades
    const localConnection = req.pool; // Use a conexão da pool definida como req.pool

    if (!localConnection) {
      console.error('Conexão local não definida');
      return res.status(500).send('Erro no servidor');
    }

    const [existingUser] = await localConnection.query('SELECT vendedor_nome FROM usuariosandroid WHERE username = ?', [username]);

    if (existingUser.length === 0) {
      console.log('Vendedor:', req.user.nome, 'tentou remover o usuário', 'Usuário:', username, 'mas não existe');
      return res.redirect('/removeandroid?nonexistentLoginAlert=Login%20não%20encontrado.%20Por%20favor,%20verifique%20seu%20nome%20de%20usuário.');
    }

    if (existingUser[0].vendedor_nome !== vendedorNome) {
      console.log('Vendedor:', req.user.nome, 'tentou remover o usuário', 'Usuário:', username, 'mas não é possivel remover logins de outros vendedores');
      return res.redirect('/removeandroid?errorRemoveAlert=Não%20é%20possível%20remover%20logins%20de%20outros%20vendedores.%20Por%20favor,%20verifique%20o%20nome%20de%20usuário.');
    }

    await localConnection.query('DELETE FROM usuarios WHERE username = ? AND vendedor_nome = ?', [username, vendedorNome]);
    console.log('Vendedor:', req.user.nome, 'removeu o usuário', 'Usuário:', username);
    return res.redirect('/removeandroid?successMessage=Usuário%20removido%20com%20sucesso');
  } catch (err) {
    console.error(err);
    res.redirect('/removeandroid?errorMessage=Erro%20ao%20remover%20usuário');
  }
});


app.get('/removeexternal', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const vendedorNome = req.user.nome;
      const localConnection = req.pool;

      let user = {
        vendedor_nome: vendedorNome,
        // outros dados do usuário
      };

      if (!localConnection) {
        console.error('Conexão local não definida');
        return res.status(500).send('Erro no servidor');
      }

      const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

      if (vendedorData.length === 0) {
        return res.status(500).send('Vendedor não encontrado.');
      }

      const creditsAmount = vendedorData[0].creditos;

      res.render('remove_userexternal', { creditsAmount, username: vendedorNome, user });
    } catch (error) {
      console.error('Erro ao buscar créditos do vendedor:', error);
      res.status(500).send('Erro ao buscar créditos do vendedor.');
    }
  } else {
    res.redirect('/login');
  }
});

app.post('/remove_userexternal', async (req, res) => {
  try {
    const { username } = req.body;
    const vendedorNome = req.user.nome;

    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      if (username !== 'MIKE IOS' || vendedorNome === 'RAFA IOS') {
        const localConnection = req.pool;

        if (!localConnection) {
          console.error('Conexão local não definida');
          return res.status(500).send('Erro no servidor');
        }

        const [existingUser] = await localConnection.query('SELECT vendedor_nome FROM usuariosexternal WHERE username = ?', [username]);

        if (existingUser.length > 0) {
          await localConnection.query('DELETE FROM usuariosexternal WHERE username = ?', [username]);
          console.log('Vendedor:', req.user.nome, 'removeu o usuário', 'Usuário:', username);
          return res.redirect('/removeexternal?successAlert=Usuário%20removido%20com%20sucesso&successMessage=Usuário%20removido%20com%20sucesso');
        } else {
          const [existingVendedor] = await localConnection.query('SELECT * FROM vendedores WHERE username = ?', [username]);

          if (existingVendedor.length > 0) {
            await localConnection.query('DELETE FROM vendedores WHERE username = ?', [username]);
            console.log('Vendedor:', req.user.nome, 'removeu o usuário', 'Usuário:', username);
            return res.redirect('/removeexternal?SuccessAlertVendedor=Vendedor%20removido%20com%20sucesso&successMessage=Vendedor%20removido%20com%20sucesso');
          }
        }
      }
    }

    const localConnection = req.pool;

    if (!localConnection) {
      console.error('Conexão local não definida');
      return res.status(500).send('Erro no servidor');
    }

    const [existingUser] = await localConnection.query('SELECT vendedor_nome FROM usuariosexternal WHERE username = ?', [username]);

    if (existingUser.length === 0) {
      console.log('Vendedor:', req.user.nome, 'tentou remover o usuário', 'Usuário:', username, 'mas não existe');
      return res.redirect('/removeexternal?nonexistentLoginAlert=Login%20não%20encontrado.%20Por%20favor,%20verifique%20seu%20nome%20de%20usuário.');
    }

    if (existingUser[0].vendedor_nome !== vendedorNome) {
      console.log('Vendedor:', req.user.nome, 'tentou remover o usuário', 'Usuário:', username, 'mas não é possível remover logins de outros vendedores');
      return res.redirect('/removeexternal?errorRemoveAlert=Não%20é%20possível%20remover%20logins%20de%20outros%20vendedores.%20Por%20favor,%20verifique%20o%20nome%20de%20usuário.');
    }

    await localConnection.query('DELETE FROM usuariosexternal WHERE username = ? AND vendedor_nome = ?', [username, vendedorNome]);
    console.log('Vendedor:', req.user.nome, 'removeu o usuário', 'Usuário:', username);
    return res.redirect('/removeexternal?successMessage=Usuário%20removido%20com%20sucesso');
  } catch (err) {
    console.error(err);
    res.redirect('/removeexternal?errorMessage=Erro%20ao%20remover%20usuário');
  }
});




app.get('/reset', async (req, res) => {
  if (req.isAuthenticated()) {
    const vendedorNome = req.user.nome;
    const { username } = req.body;

    // Verifique se o vendedor autenticado tem permissão para redefinir o UUID deste usuário (adicionar sua lógica de permissão aqui)

    // Tente redefinir o UUID do usuário
    try {
      if (!vendedorNome) {
        return res.status(400).send('Nome de vendedor ausente na sessão.');
      }
                    let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };




      await localConnection.query('UPDATE usuarios SET uuid = NULL WHERE username = ? AND vendedor_nome = ?', [vendedorNome, vendedorNome]);


      // Renderize o arquivo EJS e passe os dados do vendedor
      const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

      if (vendedorData.length === 0) {
        // Vendedor não encontrado, lide com isso como apropriado
        return res.status(500).send('Vendedor não encontrado.');
      }

      const creditsAmount = vendedorData[0].creditos;

      res.render('reset', { creditsAmount, username: vendedorNome, user });
    } catch (error) {
      console.error('Erro ao redefinir o UUID do usuário:', error);
      res.status(500).send('Erro ao redefinir o UUID do usuário.');
    }
  } else {
    res.redirect('/login');
  }
});






app.post('/reset_user', async (req, res) => {
  try {
    const { username } = req.body;
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado
    const [existingUser] = await localConnection.query('SELECT vendedor_nome FROM usuarios WHERE username = ?', [username]);

    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      if (existingUser.length === 0) {
        console.log('Vendedor:', req.user.nome, 'tentou resetar o UUID do usuário', 'Usuário:', username, 'mas não existe',);
        return res.redirect('/reset?nonexistentLoginAlert=Login%20não%20encontrado.%20Por%20favor,%20verifique%20seu%20nome%20de%20usuário.');
      }

      // Vendedor 'MIKE IOS' pode redefinir qualquer login
      const result = await localConnection.query('UPDATE usuarios SET uuid = NULL WHERE username = ?', [username]);

      if (result.affectedRows > 0) {
              console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
        return res.redirect('/reset?successMessage=Usuário%20redefinido%20com%20sucesso');
      } else {
              console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
        return res.redirect('/reset?successMessage=Usuário%20redefinido%20com%20sucesso');
      }
    } else {
      if (existingUser.length === 0) {
        console.log('Vendedor:', req.user.nome, 'tentou resetar o UUID do usuário', 'Usuário:', username, 'mas não existe',);
        return res.redirect('/reset?nonexistentLoginAlert=Login%20não%20encontrado.%20Por%20favor,%20verifique%20seu%20nome%20de%20usuário.');
      } else if (existingUser[0].vendedor_nome === vendedorNome) {
        // O vendedor autenticado pode redefinir o UUID deste usuário
        const result = await localConnection.query('UPDATE usuarios SET uuid = NULL WHERE username = ?', [username]);
        
        if (result.affectedRows > 0) {
                console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
          return res.redirect('/reset?successMessage=Usuário%20redefinido%20com%20sucesso');
        } else {
                console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
          return res.redirect('reset?successMessage=Usuário%20redefinido%20com%20sucesso');
        }
      } else {
        console.log('Vendedor:', req.user.nome, 'tentou resetar o UUID do usuário', 'Usuário:', username, 'mas não pode resetar usuarios de outros vendedores',);
        return res.redirect('/reset?errorRemoveAlert=Você%20não%20tem%20permissão%20para%20redefinir%20o%20UUID%20deste%20usuário');
      }
    }
  } catch (err) {
    console.error(err);
    return res.redirect('/reset?errorAlert=Erro%20ao%20redefinir%20UUID');
  }
});


app.get('/resetexternal', async (req, res) => {
  if (req.isAuthenticated()) {
    const vendedorNome = req.user.nome;
    const { username } = req.body;

    // Verifique se o vendedor autenticado tem permissão para redefinir o UUID deste usuário (adicionar sua lógica de permissão aqui)

    // Tente redefinir o UUID do usuário
    try {
      if (!vendedorNome) {
        return res.status(400).send('Nome de vendedor ausente na sessão.');
      }
                    let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };




      await localConnection.query('UPDATE usuariosexternal SET uuid = NULL WHERE username = ? AND vendedor_nome = ?', [vendedorNome, vendedorNome]);


      // Renderize o arquivo EJS e passe os dados do vendedor
      const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

      if (vendedorData.length === 0) {
        // Vendedor não encontrado, lide com isso como apropriado
        return res.status(500).send('Vendedor não encontrado.');
      }

      const creditsAmount = vendedorData[0].creditos;

      res.render('resetexternal', { creditsAmount, username: vendedorNome, user });
    } catch (error) {
      console.error('Erro ao redefinir o UUID do usuário:', error);
      res.status(500).send('Erro ao redefinir o UUID do usuário.');
    }
  } else {
    res.redirect('/login');
  }
});


app.post('/reset_userexternal', async (req, res) => {
  try {
    const { username } = req.body;
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado
    const [existingUser] = await localConnection.query('SELECT vendedor_nome FROM usuariosexternal WHERE username = ?', [username]);

    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      if (existingUser.length === 0) {
        console.log('Vendedor:', req.user.nome, 'tentou resetar o UUID do usuário', 'Usuário:', username, 'mas não existe',);
        return res.redirect('/resetexternal?nonexistentLoginAlert=Login%20não%20encontrado.%20Por%20favor,%20verifique%20seu%20nome%20de%20usuário.');
      }

      // Vendedor 'MIKE IOS' pode redefinir qualquer login
      const result = await localConnection.query('UPDATE usuariosexternal SET uuid = NULL WHERE username = ?', [username]);

      if (result.affectedRows > 0) {
              console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
        return res.redirect('/resetexternal?successMessage=Usuário%20redefinido%20com%20sucesso');
      } else {
              console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
        return res.redirect('/resetexternal?successMessage=Usuário%20redefinido%20com%20sucesso');
      }
    } else {
      if (existingUser.length === 0) {
        console.log('Vendedor:', req.user.nome, 'tentou resetar o UUID do usuário', 'Usuário:', username, 'mas não existe',);
        return res.redirect('/resetexternal?nonexistentLoginAlert=Login%20não%20encontrado.%20Por%20favor,%20verifique%20seu%20nome%20de%20usuário.');
      } else if (existingUser[0].vendedor_nome === vendedorNome) {
        // O vendedor autenticado pode redefinir o UUID deste usuário
        const result = await localConnection.query('UPDATE usuariosexternal SET uuid = NULL WHERE username = ?', [username]);
        
        if (result.affectedRows > 0) {
                console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
          return res.redirect('/resetexternal?successMessage=Usuário%20redefinido%20com%20sucesso');
        } else {
                console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
          return res.redirect('resetexternal?successMessage=Usuário%20redefinido%20com%20sucesso');
        }
      } else {
        console.log('Vendedor:', req.user.nome, 'tentou resetar o UUID do usuário', 'Usuário:', username, 'mas não pode resetar usuarios de outros vendedores',);
        return res.redirect('/resetexternal?errorRemoveAlert=Você%20não%20tem%20permissão%20para%20redefinir%20o%20UUID%20deste%20usuário');
      }
    }
  } catch (err) {
    console.error(err);
    return res.redirect('/resetexternal?errorAlert=Erro%20ao%20redefinir%20UUID');
  }
});



app.get('/resetandroid', async (req, res) => {
  if (req.isAuthenticated()) {
    const vendedorNome = req.user.nome;
    const { username } = req.body;

    // Verifique se o vendedor autenticado tem permissão para redefinir o UUID deste usuário (adicionar sua lógica de permissão aqui)

    // Tente redefinir o UUID do usuário
    try {
      if (!vendedorNome) {
        return res.status(400).send('Nome de vendedor ausente na sessão.');
      }
                    let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };




      await localConnection.query('UPDATE usuariosandroid SET uuid = NULL WHERE username = ? AND vendedor_nome = ?', [vendedorNome, vendedorNome]);


      // Renderize o arquivo EJS e passe os dados do vendedor
      const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);

      if (vendedorData.length === 0) {
        // Vendedor não encontrado, lide com isso como apropriado
        return res.status(500).send('Vendedor não encontrado.');
      }

      const creditsAmount = vendedorData[0].creditos;

      res.render('resetandroid', { creditsAmount, username: vendedorNome, user });
    } catch (error) {
      console.error('Erro ao redefinir o UUID do usuário:', error);
      res.status(500).send('Erro ao redefinir o UUID do usuário.');
    }
  } else {
    res.redirect('/login');
  }
});


app.post('/reset_userandroid', async (req, res) => {
  try {
    const { username } = req.body;
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado
    const [existingUser] = await localConnection.query('SELECT vendedor_nome FROM usuariosandroid WHERE username = ?', [username]);

    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      if (existingUser.length === 0) {
        console.log('Vendedor:', req.user.nome, 'tentou resetar o UUID do usuário', 'Usuário:', username, 'mas não existe',);
        return res.redirect('/resetandroid?nonexistentLoginAlert=Login%20não%20encontrado.%20Por%20favor,%20verifique%20seu%20nome%20de%20usuário.');
      }

      // Vendedor 'MIKE IOS' pode redefinir qualquer login
      const result = await localConnection.query('UPDATE usuariosandroid SET uuid = NULL WHERE username = ?', [username]);

      if (result.affectedRows > 0) {
              console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
        return res.redirect('/resetandroid?successMessage=Usuário%20redefinido%20com%20sucesso');
      } else {
              console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
        return res.redirect('/resetandroid?successMessage=Usuário%20redefinido%20com%20sucesso');
      }
    } else {
      if (existingUser.length === 0) {
        console.log('Vendedor:', req.user.nome, 'tentou resetar o UUID do usuário', 'Usuário:', username, 'mas não existe',);
        return res.redirect('/resetandroid?nonexistentLoginAlert=Login%20não%20encontrado.%20Por%20favor,%20verifique%20seu%20nome%20de%20usuário.');
      } else if (existingUser[0].vendedor_nome === vendedorNome) {
        // O vendedor autenticado pode redefinir o UUID deste usuário
        const result = await localConnection.query('UPDATE usuariosandroid SET uuid = NULL WHERE username = ?', [username]);
        
        if (result.affectedRows > 0) {
                console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
          return res.redirect('/resetandroid?successMessage=Usuário%20redefinido%20com%20sucesso');
        } else {
                console.log('Vendedor:', req.user.nome, 'resetou o UUID do usuário', 'Usuário:', username);
          return res.redirect('resetandroid?successMessage=Usuário%20redefinido%20com%20sucesso');
        }
      } else {
        console.log('Vendedor:', req.user.nome, 'tentou resetar o UUID do usuário', 'Usuário:', username, 'mas não pode resetar usuarios de outros vendedores',);
        return res.redirect('/resetandroid?errorRemoveAlert=Você%20não%20tem%20permissão%20para%20redefinir%20o%20UUID%20deste%20usuário');
      }
    }
  } catch (err) {
    console.error(err);
    return res.redirect('/resetandroid?errorAlert=Erro%20ao%20redefinir%20UUID');
  }
});




// Defina a função formatDate
function formatDate(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function renderUserTable1(res, rows, vendedorNome, user) { // Adicione vendedorNome como argumento
  const tableContent = rows.map(row => {
    const tableRow = {
      vendedor_nome: row.vendedor_nome,
      username: row.username,
      password: row.password,
      data_expiracao: formatDate(row.data_expiracao),
      device_model: row.device_model,
    };
    
    if (row.username === '2diasfree') {
      tableRow.uuid = `${row.access_count || 0}/99999`; // Use 0 se access_count for undefined
    } else {
      tableRow.uuid = row.uuid ? '1/1' : '0/1';
    }

    return tableRow;
  });
  res.render('usuarios', { tableContent, username: vendedorNome, user });
}

app.get('/users', async (req, res) => {
  try {
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado

    let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };

    let query = 'SELECT username, password, data_expiracao, vendedor_nome, uuid, device_model, access_count  FROM usuarios';

    // Modifique a condição para incluir todos os usuários se for "MIKE IOS"
    // Ou apenas os usuários do vendedor atual se for outro vendedor
    if (vendedorNome !== 'adm') {
      query += ' WHERE vendedor_nome = ?';
    }

    // Adicione a cláusula ORDER BY para ordenar pela ordem inversa da tabela (mais recente no topo)
    query += ' ORDER BY id DESC';

    const [rows] = await localConnection.query(query, (vendedorNome !== 'adm') ? [vendedorNome] : []);

    renderUserTable1(res, rows, vendedorNome, user); // Passe vendedorNome como argumento
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar os usuários no banco de dados');
  }
});


// Defina a função formatDate
function formatDate(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function renderUserTable2(res, rows, vendedorNome, user) { // Adicione vendedorNome como argumento
  const tableContent = rows.map(row => {
    const tableRow = {
      vendedor_nome: row.vendedor_nome,
      username: row.username,
      password: row.password,
      data_expiracao: formatDate(row.data_expiracao),
      device_model: row.device_model,
    };
    
    if (row.username === '2diasfree') {
      tableRow.uuid = `${row.access_count || 0}/99999`; // Use 0 se access_count for undefined
    } else {
      tableRow.uuid = row.uuid ? '1/1' : '0/1';
    }

    return tableRow;
  });
  res.render('usuariosexternal', { tableContent, username: vendedorNome, user });
}

app.get('/usersexternal', async (req, res) => {
  try {
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado

    let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };

    let query = 'SELECT username, password, data_expiracao, vendedor_nome, uuid, device_model, access_count  FROM usuariosexternal';

    // Modifique a condição para incluir todos os usuários se for "MIKE IOS"
    // Ou apenas os usuários do vendedor atual se for outro vendedor
    if (vendedorNome !== 'adm') {
      query += ' WHERE vendedor_nome = ?';
    }

    // Adicione a cláusula ORDER BY para ordenar pela ordem inversa da tabela (mais recente no topo)
    query += ' ORDER BY id DESC';

    const [rows] = await localConnection.query(query, (vendedorNome !== 'adm') ? [vendedorNome] : []);

    renderUserTable2(res, rows, vendedorNome, user); // Passe vendedorNome como argumento
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar os usuários no banco de dados');
  }
});



// Defina a função formatDateandroid
function formatDateandroid(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function renderUserTableandroid(res, rows, vendedorNome, user) { // Adicione vendedorNome como argumento
  const tableContent = rows.map(row => {
    const tableRow = {
      vendedor_nome: row.vendedor_nome,
      username: row.username,
      password: row.password,
      data_expiracao: formatDateandroid(row.data_expiracao),
    };

    if (row.username === '2diasfree') {
      tableRow.uuid = `${row.access_count || 0}/99999`; // Use 0 se access_count for undefined
    } else {
      tableRow.uuid = row.uuid ? '1/1' : '0/1';
    }

    return tableRow;
  });

  res.render('usuariosandroid', { tableContent, username: vendedorNome, user });
}

app.get('/usersandroid', async (req, res) => {
  try {
    const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado

    let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };

    let query = 'SELECT username, password, data_expiracao, vendedor_nome, uuid  FROM usuariosandroid';

    // Modifique a condição para incluir todos os usuários se for "MIKE IOS"
    // Ou apenas os usuários do vendedor atual se for outro vendedor
    if (vendedorNome !== 'adm') {
      query += ' WHERE vendedor_nome = ?';
    }

    // Adicione a cláusula ORDER BY para ordenar pela ordem inversa da tabela (mais recente no topo)
    query += ' ORDER BY id DESC';

    const [rows] = await localConnection.query(query, (vendedorNome !== 'adm') ? [vendedorNome] : []);

    renderUserTableandroid(res, rows, vendedorNome, user); // Passe vendedorNome como argumento
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar os usuários no banco de dados');
  }
});







// Rota para acessar a página de criação de vendedor
app.get('/add-admins', (req, res) => {
  // Verifique se o vendedor autenticado é "MIKE IOS"
  
  
  const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado
  if (req.isAuthenticated() && req.user.nome === 'adm') {
    // O vendedor é "MIKE IOS", então ele pode criar um login de vendedor
    
    
    res.render('create_vendedor', { username: vendedorNome }); // Você pode renderizar uma página de criação de vendedor aqui
  } else {
    // Se o vendedor não for "MIKE IOS," redirecione para uma página de erro ou exiba uma mensagem
    res.status(403).send('Você não tem permissão para acessar essa página.');
  }
});

// Rota para lidar com o envio do formulário de criação de vendedor
app.post('/create_vendedor', async (req, res) => {
  
  const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado
  // Verifique novamente se o vendedor autenticado é "MIKE IOS"
  if (req.isAuthenticated() && req.user.nome === 'adm') {
    // Os detalhes do novo vendedor estão disponíveis em req.body
    const { username, password, nome, creditos } = req.body;

    // Verifique se todos os campos foram preenchidos
    if (!username || !password || !nome || !creditos) {
      return res.redirect('/add-admins?error=Preencha%20todos%20os%20campos'); // Redirecione em caso de campos em branco
    }

    // Insira os detalhes do novo vendedor na tabela de vendedores
    try {
      await localConnection.query('INSERT INTO vendedores (username, password, nome, creditos) VALUES (?, ?, ?, ?)', [username, password, nome, creditos]);
      res.redirect('/add-admins?successMessage=Vendedor%20criado%20com%20sucesso'); // Redirecione para a página de sucesso
    } catch (error) {
      console.error(error);
      res.redirect('/add-admins?errorMessage=Erro%20ao%20criar%20o%20vendedor'); // Em caso de erro
    }
  } else {
    // Se o vendedor não for "MIKE IOS," redirecione para uma página de erro ou exiba uma mensagem
    res.status(403).send('Você não tem permissão para acessar essa página.');
  }
});



app.get('/credits', async (req, res) => {
  const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado

  if (vendedorNome === 'adm') {
    // Se o vendedor for "MIKE IOS," renderize a página de créditos
    res.render('credits.ejs', { username: vendedorNome });
  } else {
    // Se o vendedor não for "MIKE IOS," redirecione para uma página de erro ou exiba uma mensagem
    res.status(403).send('Você não tem permissão para acessar essa página.');
  }
});

app.post('/add_credits', async (req, res) => {
  const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado
  const { username, credits, action } = req.body;

  if (vendedorNome === 'adm') {
    // Se o vendedor for "MIKE IOS," permita que ele adicione ou remova créditos do vendedor especificado
    // Primeiro, verifique se o vendedor existe na tabela de vendedores
    const [existingVendedor] = await localConnection.query('SELECT * FROM vendedores WHERE username = ?', [username]);

    if (existingVendedor.length > 0) {
      // Se o vendedor existe, atualize os créditos com base na ação
      const currentCredits = existingVendedor[0].creditos || 0;
      const parsedCredits = parseInt(credits);

      if (action === 'add') {
        // Adicionar créditos
        const newCredits = currentCredits + parsedCredits;
        await localConnection.query('UPDATE vendedores SET creditos = ? WHERE username = ?', [newCredits, username]);
        return res.redirect('/credits?successAddMessage=Créditos%20adicionados%20com%20sucesso');
      } else if (action === 'remove') {
        // Remover créditos
        if (currentCredits >= parsedCredits) {
          const newCredits = currentCredits - parsedCredits;
          await localConnection.query('UPDATE vendedores SET creditos = ? WHERE username = ?', [newCredits, username]);
          return res.redirect('/credits?successRemoveMessage=Créditos%20removidos%20com%20sucesso');
        } else {
          // Se não houver créditos suficientes para remover, redirecione para uma página de erro
          return res.redirect('/credits?errorCreditsAlert=Créditos%20insuficientes%20para%20remoção.');
        }
      }
    } else {
      // Se o vendedor não existe, redirecione para uma página de erro
      return res.redirect('/credits?errorVendedorAlert=Vendedor%20não%20encontrado.%20Por%20favor,%20verifique%20o%20nome%20de%20usuário.');
    }
  } else {
    // Se o vendedor não for "MIKE IOS," redirecione para uma página de erro ou exiba uma mensagem
    res.status(403).send('Você não tem permissão para essa ação.');
  }
});



app.post('/remove_credits', async (req, res) => {
  const vendedorNome = req.user.nome; // Obtenha o nome do vendedor autenticado
  const { username, credits } = req.body;

  if (vendedorNome === 'adm') {
    // Se o vendedor for "MIKE IOS," permita que ele remova créditos do vendedor especificado
    // Primeiro, verifique se o vendedor existe na tabela de vendedores
    const [existingVendedor] = await localConnection.query('SELECT * FROM vendedores WHERE username = ?', [username]);

    if (existingVendedor.length > 0) {
      // Se o vendedor existe, verifique se há créditos suficientes para remover
      const currentCredits = existingVendedor[0].creditos || 0;
      const parsedCredits = parseInt(credits);

      if (currentCredits >= parsedCredits) {
        // Remover créditos
        const newCredits = currentCredits - parsedCredits;
        await localConnection.query('UPDATE vendedores SET creditos = ? WHERE username = ?', [newCredits, username]);
        return res.redirect('/credits?successRemoveMessage=Créditos%20removidos%20com%20sucesso');
      } else {
        // Se não houver créditos suficientes para remover, redirecione para uma página de erro
        return res.redirect('/credits?errorCreditsAlert=Créditos%20insuficientes%20para%20remoção.');
      }
    } else {
      // Se o vendedor não existe, redirecione para uma página de erro
      return res.redirect('/credits?errorVendedorAlert=Vendedor%20não%20encontrado.%20Por%20favor,%20verifique%20o%20nome%20de%20usuário.');
    }
  } else {
    // Se o vendedor não for "MIKE IOS," redirecione para uma página de erro ou exiba uma mensagem
    res.status(403).send('Você não tem permissão para essa ação.');
  }
});

// Função para descriptografar senhas (apenas para fins de depuração)
async function decryptPassword(passwordHash) {
  return new Promise((resolve, reject) => {
    // Aqui você não precisa especificar uma senha manualmente
    bcrypt.compare('qualquer_senha_para_comparacao', passwordHash, (err, result) => {
      if (err) {
        reject(err);
      } else if (result) {
        resolve(passwordHash); // Retorna a senha descriptografada
      } else {
        reject(new Error('Falha na descriptografia'));
      }
    });
  });
}

// Função renderAdminsTable
function renderAdminsTable(res, adminsData, vendedorNome) {
  const tableContent = adminsData.map(admin => ({
    username: admin.username,
    password: admin.password,
    nome: admin.nome,
    creditos: admin.creditos,
  }));

  res.render('admins', { tableContent, username: vendedorNome });
}

app.get('/admins', async (req, res) => {
  const vendedorNome = req.user.nome;

  if (vendedorNome === 'adm') {
    // Verifique se o vendedor é "adm" antes de permitir o acesso
    try {
      const [admins] = await localConnection.query('SELECT username, password, nome, creditos FROM vendedores');
      // Obtenha os dados da tabela de vendedores

      renderAdminsTable(res, admins, vendedorNome);

    } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao recuperar dados dos vendedores');
    }
  } else {
    res.status(403).send('Você não tem permissão para acessar esta página');
  }
});






app.post('/add-days', async (req, res) => {
  try {
    const { daysToAdd, username } = req.body;
    const vendedorNome = req.user.nome;

    // Busque os créditos do vendedor
    const creditsAmount = await buscarCreditosVendedor(vendedorNome, localConnection);
    

    // Check if the vendedorNome is 'MIKE IOS' or 'MIKE iOS'
    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      // If the vendedorNome is 'MIKE IOS' or 'MIKE iOS', they have permissions to add days
      const [user] = await localConnection.query('SELECT * FROM usuarios WHERE username = ?', [username]);

      if (user.length === 0) {
        // Usuário não encontrado
        console.log('Vendedor:', req.user.nome, 'tentou adicionar dias ao usuário', '|','Usuário:', username, '|','Validade:', daysToAdd, '|','mas não existe');
        return res.redirect('/add-days?nonexistentLoginAlert=Usuário%20não%20encontrado');
      }

      const userRecord = user[0];

      // Allow 'MIKE IOS' and 'MIKE iOS' to add days to any user
      // No need to check userRecord.vendedor_nome in this case
      const dataExpiracao = new Date(userRecord.data_expiracao);
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(daysToAdd, 10));
      const dataExpiracaoFormatada = dataExpiracao.toISOString().slice(0, 19).replace('T', ' ');

      await localConnection.query('UPDATE usuarios SET data_expiracao = ? WHERE username = ?', [dataExpiracaoFormatada, username]);

      // Deduzir créditos from the vendedor, except for 'MIKE IOS' and 'MIKE iOS'
      if (vendedorNome !== 'MIKE IOS' && vendedorNome !== 'RAFA IOS' || vendedorNome === 'adm') {
        await localConnection.query('UPDATE vendedores SET creditos = creditos - ? WHERE nome = ?', [calcularCreditosNecessarios(daysToAdd), vendedorNome]);
      }

      // Envie a resposta de sucesso aqui
      console.log('Vendedor:', req.user.nome, 'adicionou dias ao usuario', '|','Usuário:', username, '|','Validade:', daysToAdd);
      return res.redirect(`/add-days?successMessage=Dias%20adicionados%20com%20sucesso`);
    } else {
      // Vendedor não tem permissão para adicionar dias
      console.log('Vendedor:', req.user.nome, 'tentou adicionar dias ao usuário', '|','Usuário:', username, '|','Validade:', daysToAdd, '|','mas não pode adicionar dias a usuarios de outros vendedores');
      return res.redirect('/add-days?ErrorAddAlert=Você%20não%20pode%20adicionar%20dias%20a%20um%20usuário%20de%20outro%20vendedor');
    }
  } catch (error) {
    console.error('Erro ao adicionar dias:', error);
    // Envie a resposta de erro aqui
    return res.status(500).send('Erro ao adicionar dias.');
  }
});






app.get('/add-days', async (req, res) => {
  try {
    const vendedorNome = req.user.nome;

    // Busque os créditos do vendedor
    const creditsAmount = await buscarCreditosVendedor(vendedorNome, localConnection);
                  let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };


    res.render('add-days', { creditsAmount, user, username: vendedorNome });
  } catch (error) {
    console.error('Erro ao buscar créditos do vendedor:', error);
    res.status(500).send('Erro ao buscar créditos do vendedor.');
  }
});


async function buscarCreditosVendedor(vendedorNome, localConnection) {
  try {
    const [vendedorData] = await localConnection.query('SELECT creditos FROM vendedores WHERE nome = ?', [vendedorNome]);
    if (vendedorData.length > 0) {
      return vendedorData[0].creditos;
    }
    return 0; // Ou algum valor padrão caso o vendedor não seja encontrado
  } catch (error) {
    console.error('Erro ao buscar créditos do vendedor:', error);
    return 0; // Trate o erro ou retorne um valor padrão
  }
}

app.post('/add-days-android', async (req, res) => {
  try {
    const { daysToAdd, username } = req.body;
    const vendedorNome = req.user.nome;

    // Busque os créditos do vendedor
    const creditsAmount = await buscarCreditosVendedor(vendedorNome, localConnection);
    

    // Check if the vendedorNome is 'MIKE IOS' or 'MIKE iOS'
    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      // If the vendedorNome is 'MIKE IOS' or 'MIKE iOS', they have permissions to add days
      const [user] = await localConnection.query('SELECT * FROM usuariosandroid WHERE username = ?', [username]);

      if (user.length === 0) {
        // Usuário não encontrado
        console.log('Vendedor:', req.user.nome, 'tentou adicionar dias ao usuário', '|','Usuário:', username, '|','Validade:', daysToAdd, '|','mas não existe');
        return res.redirect('/add-days-android?nonexistentLoginAlert=Usuário%20não%20encontrado');
      }

      const userRecord = user[0];

      // Allow 'MIKE IOS' and 'MIKE iOS' to add days to any user
      // No need to check userRecord.vendedor_nome in this case
      const dataExpiracao = new Date(userRecord.data_expiracao);
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(daysToAdd, 10));
      const dataExpiracaoFormatada = dataExpiracao.toISOString().slice(0, 19).replace('T', ' ');

      await localConnection.query('UPDATE usuariosandroid SET data_expiracao = ? WHERE username = ?', [dataExpiracaoFormatada, username]);

      // Deduzir créditos from the vendedor, except for 'MIKE IOS' and 'MIKE iOS'
      if (vendedorNome !== 'MIKE IOS' && vendedorNome !== 'RAFA IOS' || vendedorNome === 'adm') {
        await localConnection.query('UPDATE vendedores SET creditos = creditos - ? WHERE nome = ?', [calcularCreditosNecessarios(daysToAdd), vendedorNome]);
      }

      // Envie a resposta de sucesso aqui
      console.log('Vendedor:', req.user.nome, 'adicionou dias ao usuario', '|','Usuário:', username, '|','Validade:', daysToAdd);
      return res.redirect(`/add-days-android?successMessage=Dias%20adicionados%20com%20sucesso`);
    } else {
      // Vendedor não tem permissão para adicionar dias
      console.log('Vendedor:', req.user.nome, 'tentou adicionar dias ao usuário', '|','Usuário:', username, '|','Validade:', daysToAdd, '|','mas não pode adicionar dias a usuarios de outros vendedores');
      return res.redirect('/add-days-android?ErrorAddAlert=Você%20não%20pode%20adicionar%20dias%20a%20um%20usuário%20de%20outro%20vendedor');
    }
  } catch (error) {
    console.error('Erro ao adicionar dias:', error);
    // Envie a resposta de erro aqui
    return res.status(500).send('Erro ao adicionar dias.');
  }
});






app.get('/add-days-android', async (req, res) => {
  try {
    const vendedorNome = req.user.nome;

    // Busque os créditos do vendedor
    const creditsAmount = await buscarCreditosVendedor(vendedorNome, localConnection);
                  let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };


    res.render('add-daysandroid', { creditsAmount, user, username: vendedorNome });
  } catch (error) {
    console.error('Erro ao buscar créditos do vendedor:', error);
    res.status(500).send('Erro ao buscar créditos do vendedor.');
  }
});


app.post('/add-days-external', async (req, res) => {
  try {
    const { daysToAdd, username } = req.body;
    const vendedorNome = req.user.nome;

    // Busque os créditos do vendedor
    const creditsAmount = await buscarCreditosVendedor(vendedorNome, localConnection);

    // Verifique se o vendedorNome é 'MIKE IOS', 'RAFA IOS' ou 'adm'
    if (vendedorNome === 'MIKE IOS' || vendedorNome === 'RAFA IOS' || vendedorNome === 'adm') {
      // Se o vendedorNome for 'MIKE IOS', 'RAFA IOS' ou 'adm', eles têm permissão para adicionar dias
      const [user] = await localConnection.query('SELECT * FROM usuariosexternal WHERE username = ?', [username]);

      if (user.length === 0) {
        // Usuário não encontrado
        console.log('Vendedor:', req.user.nome, 'tentou adicionar dias ao usuário', '|', 'Usuário:', username, '|', 'Validade:', daysToAdd, '|', 'mas não existe');
        return res.redirect('/add-days-external?nonexistentLoginAlert=Usuário%20não%20encontrado');
      }

      const userRecord = user[0];

      // Permitir que 'MIKE IOS' e 'MIKE iOS' adicionem dias a qualquer usuário
      // Não é necessário verificar userRecord.vendedor_nome neste caso
      const dataExpiracao = new Date(userRecord.data_expiracao);
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(daysToAdd, 10));
      const dataExpiracaoFormatada = dataExpiracao.toISOString().slice(0, 19).replace('T', ' ');

      await localConnection.query('UPDATE usuariosexternal SET data_expiracao = ? WHERE username = ?', [dataExpiracaoFormatada, username]);

      // Deduzir créditos do vendedor, exceto para 'MIKE IOS', 'RAFA IOS' e 'adm'
      if (vendedorNome !== 'MIKE IOS' && vendedorNome !== 'RAFA IOS' && vendedorNome !== 'adm') {
        await localConnection.query('UPDATE vendedores SET creditos = creditos - ? WHERE nome = ?', [calcularCreditosNecessarios(daysToAdd), vendedorNome]);
      }

      // Envie a resposta de sucesso aqui
      console.log('Vendedor:', req.user.nome, 'adicionou dias ao usuário', '|', 'Usuário:', username, '|', 'Validade:', daysToAdd);
      return res.redirect(`/add-days-external?successMessage=Dias%20adicionados%20com%20sucesso`);
    } else {
      // O vendedor não tem permissão para adicionar dias
      console.log('Vendedor:', req.user.nome, 'tentou adicionar dias ao usuário', '|', 'Usuário:', username, '|', 'Validade:', daysToAdd, '|', 'mas não pode adicionar dias a usuários de outros vendedores');
      return res.redirect('/add-days-external?ErrorAddAlert=Você%20não%20pode%20adicionar%20dias%20a%20um%20usuário%20de%20outro%20vendedor');
    }
  } catch (error) {
    console.error('Erro ao adicionar dias:', error);
    // Envie a resposta de erro aqui
    return res.status(500).send('Erro ao adicionar dias.');
  }
});

app.get('/add-days-external', async (req, res) => {
  try {
    const vendedorNome = req.user.nome;

    // Busque os créditos do vendedor
    const creditsAmount = await buscarCreditosVendedor(vendedorNome, localConnection);
    let user = {
      vendedor_nome: vendedorNome,
      // outros dados do usuário
    };

    res.render('add-days-external', { creditsAmount, user, username: vendedorNome });
  } catch (error) {
    console.error('Erro ao buscar créditos do vendedor:', error);
    res.status(500).send('Erro ao buscar créditos do vendedor.');
  }
});






app.get('/settings', async (req, res) => {
  if (req.isAuthenticated()) {
    const vendedorNome = req.user.nome;
    const { username } = req.body;


      res.render('settings', { username: vendedorNome });
  } else {
    res.redirect('/login');
  }
});



    
// Inicie o servidor
const port = process.env.PORT || 3000;

async function startServer() {
  await connectToDatabase();
  app.listen(port, () => {
    console.log(`Servidor está ouvindo na porta ${port}`);
  });
}

startServer();