import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Listar todos os agendamentos do Yuri
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, data_inicio, data_fim, status } = req.query;
    let queryText = 'SELECT * FROM agendamentos_yuri';
    const params = [];
    const conditions = [];

    if (data) {
      conditions.push(' data = ?');
      params.push(data);
    }

    if (data_inicio && data_fim) {
      conditions.push(' data BETWEEN ? AND ?');
      params.push(data_inicio, data_fim);
    } else if (data_inicio) {
      conditions.push(' data >= ?');
      params.push(data_inicio);
    } else if (data_fim) {
      conditions.push(' data <= ?');
      params.push(data_fim);
    }
    
    if (status) {
      conditions.push(' status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      queryText += ' WHERE' + conditions.join(' AND');
    }
    
    queryText += ' ORDER BY data DESC, hora DESC';

    const result = await all(queryText, params);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar agendamentos do Yuri:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo agendamento para o Yuri
router.post('/', async (req, res) => {
  try {
    const { cliente_nome, servico, data, hora, status = 'Pendente', preco, forma_pagamento, observacoes, cliente_id } = req.body;

    if (!cliente_nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Cliente, serviço, data e hora são obrigatórios' });
    }

    const result = await query(
      'INSERT INTO agendamentos_yuri (cliente_id, cliente_nome, servico, data, hora, status, preco, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [cliente_id, cliente_nome, servico, data, hora, status, preco, forma_pagamento, observacoes]
    );
    
    res.status(201).json({
      id: result.lastID,
      message: 'Agendamento criado com sucesso para o Yuri'
    });
  } catch (error) {
    console.error('Erro ao criar agendamento do Yuri:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar agendamento do Yuri
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_nome, servico, data, hora, status, preco, forma_pagamento, observacoes } = req.body;

    const result = await query(
      'UPDATE agendamentos_yuri SET cliente_nome = ?, servico = ?, data = ?, hora = ?, status = ?, preco = ?, forma_pagamento = ?, observacoes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [cliente_nome, servico, data, hora, status, preco, forma_pagamento, observacoes, id]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json({ message: 'Agendamento do Yuri atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar agendamento do Yuri:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar agendamento do Yuri
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM agendamentos_yuri WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json({ message: 'Agendamento do Yuri deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar agendamento do Yuri:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
