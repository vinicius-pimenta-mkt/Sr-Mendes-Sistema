import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, 'barbearia.db');

// Criar conexão com o banco
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar com o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

// Criar tabelas
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // Tabela de usuários (admin)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Erro ao criar tabela users:', err);
        reject(err);
        return;
      }

      // Tabela de clientes
      db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          telefone TEXT,
          email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Erro ao criar tabela clientes:', err);
          reject(err);
          return;
        }

        // Tabela de agendamentos
        db.run(`
          CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            cliente_nome TEXT NOT NULL,
            servico TEXT NOT NULL,
            data DATE NOT NULL,
            hora TIME NOT NULL,
            status TEXT DEFAULT 'Pendente',
            preco DECIMAL(10,2),
            observacoes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES clientes (id)
          )
        `, (err) => {
          if (err) {
            console.error('Erro ao criar tabela agendamentos:', err);
            reject(err);
            return;
          }

          // Inserir usuário admin padrão
          const adminUser = process.env.ADMIN_USER || 'adminmendes';
          const adminPass = process.env.ADMIN_PASS || 'mendesbarber01';
          
          db.run(`
            INSERT OR IGNORE INTO users (username, password) 
            VALUES (?, ?)
          `, [adminUser, adminPass], (err) => {
            if (err) {
              console.error('Erro ao inserir usuário admin:', err);
              reject(err);
              return;
            }
            
            console.log('Banco de dados inicializado com sucesso!');
            resolve();
          });
        });
      });
    });
  });
};

// Inicializar o banco
initDatabase().catch(console.error);

export default db;

