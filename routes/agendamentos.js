import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Listar todos os agendamentos
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, data_inicio, data_fim, status } = req.query;
    let queryText = 'SELECT * FROM agendamentos';
    const params = [];
    const conditions = [];

    if (data) {
      conditions.push('data = ?');
      params.push(data);
    }
    if (data_inicio && data_fim) {
      conditions.push('data BETWEEN ? AND ?');
      params.push(data_inicio, data_fim);
    } else if (data_inicio) {
      conditions.push('data >= ?');
      params.push(data_inicio);
    } else if (data_fim) {
      conditions.push('data <= ?');
      params.push(data_fim);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY data DESC, hora DESC';

    const result = await all(queryText, params);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo agendamento
router.post('/', verifyToken, async (req, res) => {
  try {
    const { 
      cliente_nome, 
      cliente_telefone, 
      servico, 
      data, 
      hora, 
      status = 'Pendente', 
      preco, 
      forma_pagamento, 
      observacoes, 
      cliente_id = null 
    } = req.body;

    if (!cliente_nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    const result = await query(
      'INSERT INTO agendamentos (cliente_id, cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [cliente_id, cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes]
    );

    // Se for confirmado, tenta atualizar última visita do assinante
    if (status === 'Confirmado') {
      const dataVisita = `${data.split('-').reverse().join('/')} ${hora}`;
      if (cliente_telefone) {
        await query('UPDATE assinantes SET ultima_visita = ? WHERE telefone = ? OR nome = ?', [dataVisita, cliente_telefone, cliente_nome]);
      } else {
        await query('UPDATE assinantes SET ultima_visita = ? WHERE nome = ?', [dataVisita, cliente_nome]);
      }
    }

    res.status(201).json({ id: result.lastID, message: 'Agendamento criado com sucesso' });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar agendamento
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      cliente_nome, 
      cliente_telefone, 
      servico, 
      data, 
      hora, 
      status, 
      preco, 
      forma_pagamento, 
      observacoes 
    } = req.body;

    const result = await query(
      'UPDATE agendamentos SET cliente_nome = ?, cliente_telefone = ?, servico = ?, data = ?, hora = ?, status = ?, preco = ?, forma_pagamento = ?, observacoes = ? WHERE id = ?',
      [cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Se for confirmado, tenta atualizar última visita do assinante
    if (status === 'Confirmado') {
      const dataVisita = `${data.split('-').reverse().join('/')} ${hora}`;
      if (cliente_telefone) {
        await query('UPDATE assinantes SET ultima_visita = ? WHERE telefone = ? OR nome = ?', [dataVisita, cliente_telefone, cliente_nome]);
      } else {
        await query('UPDATE assinantes SET ultima_visita = ? WHERE nome = ?', [dataVisita, cliente_nome]);
      }
    }

    res.json({ message: 'Agendamento atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Cancelar/Excluir agendamento
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM agendamentos WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json({ message: 'Agendamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Agendamentos de hoje
router.get('/hoje', verifyToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const result = await all('SELECT * FROM agendamentos WHERE data = ? ORDER BY hora ASC', [hoje]);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar agendamentos de hoje:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
