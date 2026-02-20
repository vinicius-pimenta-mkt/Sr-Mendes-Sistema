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
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo agendamento (e atualizar última visita se for assinante)
router.post('/', async (req, res) => {
  try {
    const { cliente_nome, cliente_telefone, servico, data, hora, status = 'Confirmado', preco, forma_pagamento, observacoes, cliente_id } = req.body;

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
    
    res.status(201).json({ id: result.lastID, message: 'Agendamento criado' });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// Atualizar agendamento
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes } = req.body;

    await query(
      'UPDATE agendamentos SET cliente_nome=?, cliente_telefone=?, servico=?, data=?, hora=?, status=?, preco=?, forma_pagamento=?, observacoes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes, id]
    );

    if (status === 'Confirmado') {
      const dataVisita = `${data.split('-').reverse().join('/')} ${hora}`;
      if (cliente_telefone) {
        await query('UPDATE assinantes SET ultima_visita = ? WHERE telefone = ? OR nome = ?', [dataVisita, cliente_telefone, cliente_nome]);
      } else {
        await query('UPDATE assinantes SET ultima_visita = ? WHERE nome = ?', [dataVisita, cliente_nome]);
      }
    }
    
    res.json({ message: 'Agendamento atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

// Deletar agendamento
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM agendamentos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Agendamento deletado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
  }
});

// NOVO ENDPOINT: Dashboard - Próximos agendamentos (próximas 24h) da agenda em tempo real
router.get('/dashboard/proximos', verifyToken, async (req, res) => {
  try {
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0];
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().split('T')[0];
    
    // Hora atual em formato HH:MM (24h)
    const agoraHora = agora.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });

    // BUSCA DIRETA DA AGENDA: Todos os agendamentos (exceto cancelados) para hoje e amanhã
    // Não filtramos por status específico - pegamos tudo que não foi cancelado
    const todosAgendamentos = await all(`
      SELECT * FROM (
        SELECT id, cliente_nome, servico, data, hora, status, preco, 'Lucas' as barber FROM agendamentos 
        WHERE status != 'Cancelado' AND (data = ? OR data = ?)
        UNION ALL
        SELECT id, cliente_nome, servico, data, hora, status, preco, 'Yuri' as barber FROM agendamentos_yuri 
        WHERE status != 'Cancelado' AND (data = ? OR data = ?)
      ) ORDER BY data ASC, hora ASC
    `, [hoje, amanhaStr, hoje, amanhaStr]);

    // FILTRAGEM RIGOROSA: Apenas agendamentos FUTUROS (próximas 24h)
    // Para hoje: hora DEVE SER ESTRITAMENTE MAIOR que a hora atual
    // Para amanhã: hora DEVE SER MENOR ou IGUAL que a hora atual (completa 24h)
    const agendamentos24h = todosAgendamentos.filter(a => {
      if (a.data === hoje) {
        return a.hora > agoraHora;
      }
      if (a.data === amanhaStr) {
        return a.hora <= agoraHora;
      }
      return false;
    });

    // ESTATÍSTICAS DO DIA: Agendamentos que já passaram (realizados)
    const statsHoje = await get(`
      SELECT 
        COUNT(*) as total_dia,
        SUM(CASE WHEN hora < ? THEN 1 ELSE 0 END) as realizados,
        SUM(CASE WHEN status = 'Confirmado' AND hora < ? THEN COALESCE(preco, 0) ELSE 0 END) as receita_realizada
      FROM (
        SELECT status, preco, data, hora FROM agendamentos WHERE data = ? AND status != 'Cancelado'
        UNION ALL
        SELECT status, preco, data, hora FROM agendamentos_yuri WHERE data = ? AND status != 'Cancelado'
      )
    `, [agoraHora, agoraHora, hoje, hoje]);

    res.json({
      atendimentosHoje: statsHoje.total_dia || 0,
      receitaDia: (statsHoje.receita_realizada || 0) / 100,
      servicosRealizados: statsHoje.realizados || 0,
      servicosAguardando: agendamentos24h.length,
      agendamentos: agendamentos24h,
      agoraHora
    });
  } catch (error) {
    console.error('Erro em /dashboard/proximos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
