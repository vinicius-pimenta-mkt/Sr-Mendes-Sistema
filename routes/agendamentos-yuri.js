import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Função auxiliar para deixar apenas números no telefone
const limparTelefone = (telefone) => {
  if (!telefone || typeof telefone !== 'string') return null;
  const apenasNumeros = telefone.replace(/\D/g, '');
  return apenasNumeros.length > 0 ? apenasNumeros : null;
};

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
    res.status(500).json({ error: 'Erro ao buscar agendamentos do Yuri' });
  }
});

// Criar novo agendamento para o Yuri (e atualizar última visita se for assinante)
router.post('/', async (req, res) => {
  try {
    const { cliente_nome, cliente_telefone, servico, data, hora, status = 'Pendente', preco, forma_pagamento, observacoes, cliente_id } = req.body;

    if (!cliente_nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    // Limpa o telefone para salvar apenas números e trata o ID
    const telefoneLimpo = limparTelefone(cliente_telefone);
    const safeClienteId = cliente_id || null;

    const result = await query(
      'INSERT INTO agendamentos_yuri (cliente_id, cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [safeClienteId, cliente_nome, telefoneLimpo, servico, data, hora, status, preco, forma_pagamento, observacoes]
    );

    // Bloco isolado: Tenta atualizar última visita do assinante
    if (status === 'Confirmado') {
      try {
        const dataVisita = `${data.split('-').reverse().join('/')} ${hora}`;
        if (telefoneLimpo) {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE telefone = ? OR nome = ?', [dataVisita, telefoneLimpo, cliente_nome]);
        } else {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE nome = ?', [dataVisita, cliente_nome]);
        }
      } catch (assinanteError) {
        console.error('Aviso: Erro ao atualizar a visita do assinante (ignorado):', assinanteError);
      }
    }
    
    res.status(201).json({ id: result.lastID, message: 'Agendamento criado para o Yuri' });
  } catch (error) {
    console.error('Erro ao criar agendamento Yuri:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento do Yuri' });
  }
});

// Atualizar agendamento do Yuri
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes } = req.body;

    // Limpa o telefone para salvar apenas números
    const telefoneLimpo = limparTelefone(cliente_telefone);

    await query(
      'UPDATE agendamentos_yuri SET cliente_nome=?, cliente_telefone=?, servico=?, data=?, hora=?, status=?, preco=?, forma_pagamento=?, observacoes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [cliente_nome, telefoneLimpo, servico, data, hora, status, preco, forma_pagamento, observacoes, id]
    );

    // Bloco isolado: Tenta atualizar a última visita do assinante
    if (status === 'Confirmado') {
      try {
        const dataVisita = `${data.split('-').reverse().join('/')} ${hora}`;
        if (telefoneLimpo) {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE telefone = ? OR nome = ?', [dataVisita, telefoneLimpo, cliente_nome]);
        } else {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE nome = ?', [dataVisita, cliente_nome]);
        }
      } catch (assinanteError) {
        console.error('Aviso: Erro ao atualizar a visita do assinante (ignorado):', assinanteError);
      }
    }
    
    res.json({ message: 'Agendamento do Yuri atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento do Yuri' });
  }
});

// Deletar agendamento do Yuri
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM agendamentos_yuri WHERE id = ?', [req.params.id]);
    res.json({ message: 'Agendamento do Yuri deletado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar agendamento do Yuri' });
  }
});

export default router;
