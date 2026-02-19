import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;

export const initDatabase = async () => {
  try {
    const dbPath = path.join(__dirname, 'barbearia.db');
    console.log('Caminho do banco de dados:', dbPath);
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Tabela de usuários
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de clientes
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

    // Tabela de agendamentos - Lucas
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
        forma_pagamento TEXT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);

    // Tabela de agendamentos - Yuri
    await db.exec(`
      CREATE TABLE IF NOT EXISTS agendamentos_yuri (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        cliente_nome TEXT NOT NULL,
        servico TEXT NOT NULL,
        data TEXT NOT NULL,
        hora TEXT NOT NULL,
        status TEXT DEFAULT 'Pendente',
        preco REAL,
        forma_pagamento TEXT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);

    // Tabela de Assinantes (Atualizada: Telefone -> CPF)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS assinantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT NOT NULL, -- Alterado de telefone para cpf
        plano TEXT NOT NULL,
        data_vencimento TEXT, -- Formato: DD/MM
        ultima_visita TEXT,
        ultimo_pagamento TEXT,
        forma_pagamento TEXT,
        status TEXT DEFAULT 'Ativo',
        data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrações de segurança
    try { await db.exec("ALTER TABLE agendamentos ADD COLUMN forma_pagamento TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE agendamentos_yuri ADD COLUMN forma_pagamento TEXT"); } catch (e) {}
    
    // Tentar adicionar CPF se a tabela já existir mas não tiver a coluna
    try { await db.exec("ALTER TABLE assinantes ADD COLUMN cpf TEXT"); } catch (e) {}

    // Inserir usuário admin padrão se não existir
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

export const query = async (sql, params = []) => {
  if (!db) throw new Error('Database not initialized.');
  return await db.run(sql, params);
};

export const get = async (sql, params = []) => {
  if (!db) throw new Error('Database not initialized.');
  return await db.get(sql, params);
};

export const all = async (sql, params = []) => {
  if (!db) throw new Error('Database not initialized.');
  return await db.all(sql, params);
};

export default db;
