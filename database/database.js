import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

export const initDatabase = async () => {
  try {
    db = await open({
      filename: './database/barbearia.db',
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        cliente_nome TEXT NOT NULL,
        servico TEXT NOT NULL,
        data TEXT NOT NULL,
        hora TEXT NOT NULL,
        status TEXT DEFAULT 'Pendente',
        preco REAL,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);

    const adminUser = process.env.ADMIN_USER || 'adminmendes';
    const adminPass = process.env.ADMIN_PASS || 'mendesbarber01';

    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', adminUser);
    if (!existingUser) {
      await db.run('INSERT INTO users (username, password) VALUES (?, ?)', adminUser, adminPass);
      console.log('Usuário admin padrão inserido.');
    }

    console.log('Banco de dados SQLite inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar banco de dados SQLite:', error);
    throw error;
  }
};

export const query = async (sql, params) => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  const stmt = await db.prepare(sql);
  const result = await stmt.run(...params);
  stmt.finalize();
  return result;
};

export const get = async (sql, params) => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  const result = await db.get(sql, params);
  return result;
};

export const all = async (sql, params) => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  const result = await db.all(sql, params);
  return result;
};

export default db;

