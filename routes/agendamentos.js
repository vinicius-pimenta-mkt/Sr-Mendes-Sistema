import express from 'express';
import { all, get, query } from '../database/database.js';
import { getServicePrice } from '../database/services.js'; // Importar a função de preço
import { verifyToken } from './auth.js';

const router = express.Router();

// Listar todos os agendamentos com filtros opcionais de data_inicio, data_fim e status
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, data_inicio, data_fim, status } = req.query;
    let queryText = 'SELECT * FROM agendamentos';
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
    
    queryText += ' ORDER BY data, hora';

    const result = await all(queryText, params);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Agendamentos de hoje (mantido para compatibilidade, mas a rota principal pode fazer o mesmo)
router.get('/hoje', verifyToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const result = await all(
      'SELECT * FROM agendamentos WHERE data = ? ORDER BY hora',
      [hoje]
    );
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar agendamentos de hoje:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar agendamento por ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await get('SELECT * FROM agendamentos WHERE id = ?', [id]);
    
    if (!result) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo agendamento
router.post('/', async (req, res) => {
  try {
    let { cliente_nome, servico, data, hora, status = 'Confirmado', preco, observacoes, cliente_id, barber } = req.body;

    // Se o preço não for fornecido, buscar da lista de serviços
    if (!preco) {
      preco = getServicePrice(servico);
    }

    // Converter preço para centavos se for um número e não estiver em centavos
    if (typeof preco === 'number' && preco < 1000) { // Assumindo que preços menores que 1000 são em reais e precisam ser convertidos
      preco = preco * 100;
    }

    if (!cliente_nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Cliente, serviço, data e hora são obrigatórios' });
    }

    const result = await query(
      'INSERT INTO agendamentos (cliente_id, cliente_nome, servico, data, hora, status, preco, observacoes, barber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [cliente_id, cliente_nome, servico, data, hora, status, preco, observacoes, barber]
    );
    
    res.status(201).json({
      id: result.lastID,
      message: 'Agendamento criado com sucesso',
      preco: preco / 100 // Retorna o preço em reais para o frontend
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar agendamento
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_nome, servico, data, hora, status, preco, observacoes, barber } = req.body;

    if (!cliente_nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Cliente, serviço, data e hora são obrigatórios' });
    }

    const result = await query(
      'UPDATE agendamentos SET cliente_nome = ?, servico = ?, data = ?, hora = ?, status = ?, preco = ?, observacoes = ?, barber = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [cliente_nome, servico, data, hora, status, preco, observacoes, barber, id]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json({ message: 'Agendamento atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar agendamento
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM agendamentos WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json({ message: 'Agendamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
