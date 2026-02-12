import express from 'express';
import { all, get } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

router.get('/resumo', verifyToken, async (req, res) => {
  try {
    const { periodo = 'mes', data_inicio, data_fim, barber = 'Geral' } = req.query;
    let dIni, dFim;
    const hoje = new Date();
    
    if (data_inicio && data_fim) {
      dIni = data_inicio;
      dFim = data_fim;
    } else {
      let dataInicio;
      switch (periodo) {
        case 'hoje': dataInicio = hoje; break;
        case 'ontem': 
          dataInicio = new Date(); dataInicio.setDate(hoje.getDate() - 1); break;
        case 'semana': 
          dataInicio = new Date(); dataInicio.setDate(hoje.getDate() - 7); break;
        case 'ano': 
          dataInicio = new Date(); dataInicio.setFullYear(hoje.getFullYear() - 1); break;
        default: // mes
          dataInicio = new Date(); dataInicio.setMonth(hoje.getMonth() - 1);
      }
      dIni = dataInicio.toISOString().split('T')[0];
      dFim = hoje.toISOString().split('T')[0];
    }
    
    // 1. Serviços por Barbeiro
    let rawServices = [];
    if (barber === 'Geral' || barber === 'Lucas') {
      const sLucas = await all(`
        SELECT servico, 'Lucas' as barber, COUNT(*) as qty, SUM(COALESCE(preco, 0)) as revenue
        FROM agendamentos 
        WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
        GROUP BY servico
      `, [dIni, dFim]);
      rawServices = [...rawServices, ...sLucas];
    }
    if (barber === 'Geral' || barber === 'Yuri') {
      const sYuri = await all(`
        SELECT servico, 'Yuri' as barber, COUNT(*) as qty, SUM(COALESCE(preco, 0)) as revenue
        FROM agendamentos_yuri 
        WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
        GROUP BY servico
      `, [dIni, dFim]);
      rawServices = [...rawServices, ...sYuri];
    }

    const serviceMap = {};
    rawServices.forEach(s => {
      if (!serviceMap[s.servico]) {
        serviceMap[s.servico] = { service: s.servico, lucas_qty: 0, yuri_qty: 0, total_qty: 0, revenue: 0 };
      }
      if (s.barber === 'Lucas') serviceMap[s.servico].lucas_qty += s.qty;
      else serviceMap[s.servico].yuri_qty += s.qty;
      serviceMap[s.servico].total_qty += s.qty;
      serviceMap[s.servico].revenue += s.revenue / 100;
    });

    const byService = Object.values(serviceMap).sort((a, b) => b.total_qty - a.total_qty);

    // 2. Evolução da Receita
    let revenueQuery = "";
    if (barber === 'Geral') {
      revenueQuery = `SELECT data, SUM(preco) as total FROM (SELECT data, preco, status FROM agendamentos UNION ALL SELECT data, preco, status FROM agendamentos_yuri) WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY data ORDER BY data`;
    } else if (barber === 'Lucas') {
      revenueQuery = `SELECT data, SUM(preco) as total FROM agendamentos WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY data ORDER BY data`;
    } else {
      revenueQuery = `SELECT data, SUM(preco) as total FROM agendamentos_yuri WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY data ORDER BY data`;
    }
    const rawRevenue = await all(revenueQuery, [dIni, dFim]);
    const receitaDet = rawRevenue.map(r => ({ periodo: r.data.split('-').reverse().slice(0, 2).join('/'), valor: (r.total || 0) / 100 }));

    // 3. Lista de Agendamentos
    let listQuery = "";
    if (barber === 'Geral') {
      listQuery = `SELECT cliente_nome, servico, data, hora, preco, barber FROM (SELECT cliente_nome, servico, data, hora, preco, 'Lucas' as barber, status FROM agendamentos UNION ALL SELECT cliente_nome, servico, data, hora, preco, 'Yuri' as barber, status FROM agendamentos_yuri) WHERE data BETWEEN ? AND ? AND status = 'Confirmado' ORDER BY data DESC, hora DESC`;
    } else if (barber === 'Lucas') {
      listQuery = `SELECT cliente_nome, servico, data, hora, preco, 'Lucas' as barber FROM agendamentos WHERE data BETWEEN ? AND ? AND status = 'Confirmado' ORDER BY data DESC, hora DESC`;
    } else {
      listQuery = `SELECT cliente_nome, servico, data, hora, preco, 'Yuri' as barber FROM agendamentos_yuri WHERE data BETWEEN ? AND ? AND status = 'Confirmado' ORDER BY data DESC, hora DESC`;
    }
    const agendamentos = await all(listQuery, [dIni, dFim]);

    // 4. Top Clientes
    let clientsQuery = "";
    if (barber === 'Geral') {
      clientsQuery = `SELECT cliente_nome as name, COUNT(*) as visits, SUM(preco) / 100 as spent FROM (SELECT cliente_nome, preco, status, data FROM agendamentos UNION ALL SELECT cliente_nome, preco, status, data FROM agendamentos_yuri) WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY cliente_nome ORDER BY visits DESC LIMIT 10`;
    } else if (barber === 'Lucas') {
      clientsQuery = `SELECT cliente_nome as name, COUNT(*) as visits, SUM(preco) / 100 as spent FROM agendamentos WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY cliente_nome ORDER BY visits DESC LIMIT 10`;
    } else {
      clientsQuery = `SELECT cliente_nome as name, COUNT(*) as visits, SUM(preco) / 100 as spent FROM agendamentos_yuri WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY cliente_nome ORDER BY visits DESC LIMIT 10`;
    }
    const topClients = await all(clientsQuery, [dIni, dFim]);

    res.json({ by_service: byService, receita_detalhada: receitaDet, agendamentos, top_clients: topClients });
  } catch (error) {
    console.error('Erro em /resumo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const agoraHora = new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });

    // Buscar agendamentos que ainda não aconteceram hoje (hora >= agora) ou em datas futuras
    // Importante: A comparação de strings para data (YYYY-MM-DD) e hora (HH:mm) funciona no SQLite
    const data = await all(`
      SELECT * FROM (
        SELECT id, cliente_nome, servico, data, hora, status, preco, 'Lucas' as barber FROM agendamentos 
        WHERE status != 'Cancelado' AND ((data > ?) OR (data = ? AND hora >= ?))
        UNION ALL
        SELECT id, cliente_nome, servico, data, hora, status, preco, 'Yuri' as barber FROM agendamentos_yuri 
        WHERE status != 'Cancelado' AND ((data > ?) OR (data = ? AND hora >= ?))
      ) ORDER BY data ASC, hora ASC LIMIT 10
    `, [hoje, hoje, agoraHora, hoje, hoje, agoraHora]);

    const stats = await get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Confirmado' THEN preco ELSE 0 END) as revenue,
        SUM(CASE WHEN status = 'Confirmado' THEN 1 ELSE 0 END) as confirmed
      FROM (
        SELECT status, preco, data FROM agendamentos WHERE data = ?
        UNION ALL
        SELECT status, preco, data FROM agendamentos_yuri WHERE data = ?
      )
    `, [hoje, hoje]);

    res.json({
      atendimentosHoje: stats.total || 0,
      receitaDia: (stats.revenue || 0) / 100,
      servicosRealizados: stats.confirmed || 0,
      agendamentos: data
    });
  } catch (error) {
    console.error('Erro em /dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
