import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Auto-cria as tabelas no Banco de Dados se não existirem
const initDb = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco INTEGER NOT NULL,
        estoque INTEGER DEFAULT 0
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS produtos_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER,
        tipo TEXT,
        quantidade INTEGER,
        valor_total INTEGER,
        forma_pagamento TEXT,
        data TEXT,
        hora TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
      )
    `);
    console.log("✅ Tabelas de produtos criadas/verificadas com sucesso!");
  } catch (error) {
    console.error('Erro ao criar tabelas de produtos:', error);
  }
};

// A MÁGICA DA CORREÇÃO: Espera 2 segundos para dar tempo do banco de dados ligar completamente!
setTimeout(initDb, 2000);

// Listar todos os produtos
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await all('SELECT * FROM produtos ORDER BY nome ASC');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// Criar novo produto
router.post('/', verifyToken, async (req, res) => {
  try {
    const { nome, preco, estoque } = req.body;
    const precoEmCentavos = Math.round(parseFloat(preco.toString().replace(',', '.')) * 100);
    const result = await query(
      'INSERT INTO produtos (nome, preco, estoque) VALUES (?, ?, ?)',
      [nome, precoEmCentavos, estoque || 0]
    );
    res.status(201).json({ id: result.lastID, message: 'Produto cadastrado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// Movimentar (Comprar ou Vender)
router.post('/:id/movimentar', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, quantidade, forma_pagamento } = req.body;
    
    const produto = await get('SELECT * FROM produtos WHERE id = ?', [id]);
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });

    if (tipo === 'venda' && produto.estoque < quantidade) {
      return res.status(400).json({ error: `Estoque insuficiente. Restam apenas ${produto.estoque} unidades.` });
    }

    const novoEstoque = tipo === 'venda' ? produto.estoque - quantidade : produto.estoque + quantidade;
    const valorTotal = quantidade * produto.preco;
    
    // Data e Hora de Brasília
    const agora = new Date();
    const utc = agora.getTime() + (agora.getTimezoneOffset() * 60000);
    const br = new Date(utc + (3600000 * -3));
    const dataStr = br.toISOString().split('T')[0];
    const horaStr = br.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });

    await query('UPDATE produtos SET estoque = ? WHERE id = ?', [novoEstoque, id]);
    await query(
      'INSERT INTO produtos_historico (produto_id, tipo, quantidade, valor_total, forma_pagamento, data, hora) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, tipo, quantidade, valorTotal, forma_pagamento, dataStr, horaStr]
    );

    res.json({ message: 'Estoque atualizado com sucesso', novoEstoque });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao movimentar estoque' });
  }
});

// Atualizar produto (Nome e Preço)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, preco } = req.body;
    const precoEmCentavos = Math.round(parseFloat(preco.toString().replace(',', '.')) * 100);
    await query('UPDATE produtos SET nome = ?, preco = ? WHERE id = ?', [nome, precoEmCentavos, id]);
    res.json({ message: 'Produto atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// Deletar produto
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM produtos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Produto removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover produto' });
  }
});

export default router;
