import express from 'express';
import { all, get } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Função auxiliar para obter a hora atual em Brasília (GMT-3) - (NOSSA LÓGICA MANTIDA)
const getBrasiliaTime = () => {
  const agora = new Date();
  const brasiliaOffset = -3;
  const utc = agora.getTime() + (agora.getTimezoneOffset() * 60000);
  const dataBrasilia = new Date(utc + (3600000 * brasiliaOffset));
  
  const dataStr = dataBrasilia.toISOString().split('T')[0];
  const horaStr = dataBrasilia.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });
  
  return { dataStr, horaStr, dataBrasilia };
};

router.get('/resumo', verifyToken, async (req, res) => {
  try {
    let { periodo = 'mes', data_inicio, data_fim, barber = 'Geral' } = req.query;
    
    // INJEÇÃO DA MANUS: Forçar a visão exclusiva se o usuário for Yuri
    if (req.user.role === 'yuri') {
      barber = 'Yuri';
    }

    let dIni, dFim;
    const { dataStr: hojeStr, dataBrasilia: hoje } = getBrasiliaTime();
    
    if (data_inicio && data_fim) {
      dIni = data_inicio;
      dFim = data_fim;
    } else {
      let dataInicio;
      switch (periodo) {
        case 'hoje': dataInicio = hoje; break;
        case 'ontem': 
          dataInicio = new Date(hoje); dataInicio.setDate(hoje.getDate() - 1); break;
        case 'semana': 
          dataInicio = new Date(hoje); dataInicio.setDate(hoje.getDate() - 7); break;
        case 'ano': 
          dataInicio = new Date(hoje); dataInicio.setFullYear(hoje.getFullYear() - 1); break;
        default: // mes
          dataInicio = new Date(hoje); dataInicio.setMonth(hoje.getMonth() - 1);
      }
      dIni = dataInicio.toISOString().split('T')[0];
      dFim = hojeStr;
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
    const isToday = dIni === dFim && dIni === hojeStr;
    let revenueQuery = "";
    let rawRevenue = [];

    if (isToday) {
      if (barber === 'Geral') {
        revenueQuery = `SELECT substr(hora, 1, 2) || ':00' as periodo, SUM(COALESCE(preco, 0)) as total FROM (SELECT data, hora, preco, status FROM agendamentos UNION ALL SELECT data, hora, preco, status FROM agendamentos_yuri) WHERE status = 'Confirmado' AND data = ? GROUP BY periodo ORDER BY periodo`;
      } else if (barber === 'Lucas') {
        revenueQuery = `SELECT substr(hora, 1, 2) || ':00' as periodo, SUM(COALESCE(preco, 0)) as total FROM agendamentos WHERE status = 'Confirmado' AND data = ? GROUP BY periodo ORDER BY periodo`;
      } else {
        revenueQuery = `SELECT substr(hora, 1, 2) || ':00' as periodo, SUM(COALESCE(preco, 0)) as total FROM agendamentos_yuri WHERE status = 'Confirmado' AND data = ? GROUP BY periodo ORDER BY periodo`;
      }
      rawRevenue = await all(revenueQuery, [dIni]);
    } else {
      if (barber === 'Geral') {
        revenueQuery = `SELECT data as periodo, SUM(COALESCE(preco, 0)) as total FROM (SELECT data, preco, status FROM agendamentos UNION ALL SELECT data, preco, status FROM agendamentos_yuri) WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY data ORDER BY data`;
      } else if (barber === 'Lucas') {
        revenueQuery = `SELECT data as periodo, SUM(COALESCE(preco, 0)) as total FROM agendamentos WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY data ORDER BY data`;
      } else {
        revenueQuery = `SELECT data as periodo, SUM(COALESCE(preco, 0)) as total FROM agendamentos_yuri WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY data ORDER BY data`;
      }
      rawRevenue = await all(revenueQuery, [dIni, dFim]);
    }

    const receitaDet = rawRevenue.map(r => ({ 
      periodo: isToday ? r.periodo : r.periodo.split('-').reverse().join('/'), 
      valor: (r.total || 0) / 100
    }));

    // 3. Receita por Meio de Pagamento
    let paymentsQuery = "";
    if (barber === 'Geral') {
      paymentsQuery = `SELECT forma_pagamento, SUM(COALESCE(preco, 0)) as total, COUNT(*) as qty FROM (SELECT forma_pagamento, preco, status, data FROM agendamentos UNION ALL SELECT forma_pagamento, preco, status, data FROM agendamentos_yuri) WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY forma_pagamento`;
    } else if (barber === 'Lucas') {
      paymentsQuery = `SELECT forma_pagamento, SUM(COALESCE(preco, 0)) as total, COUNT(*) as qty FROM agendamentos WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY forma_pagamento`;
    } else {
      paymentsQuery = `SELECT forma_pagamento, SUM(COALESCE(preco, 0)) as total, COUNT(*) as qty FROM agendamentos_yuri WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY forma_pagamento`;
    }
    const rawPayments = await all(paymentsQuery, [dIni, dFim]);
    const byPayment = rawPayments.map(p => ({
      forma: p.forma_pagamento || 'Não informado',
      valor: (p.total || 0) / 100,
      quantidade: p.qty
    }));

    // 4. Lista de Agendamentos
    let listQuery = "";
    if (barber === 'Geral') {
      listQuery = `SELECT cliente_nome, servico, data, hora, preco, forma_pagamento, barber FROM (SELECT cliente_nome, servico, data, hora, preco, forma_pagamento, 'Lucas' as barber, status FROM agendamentos UNION ALL SELECT cliente_nome, servico, data, hora, preco, forma_pagamento, 'Yuri' as barber, status FROM agendamentos_yuri) WHERE data BETWEEN ? AND ? AND status = 'Confirmado' ORDER BY data DESC, hora DESC`;
    } else if (barber === 'Lucas') {
      listQuery = `SELECT cliente_nome, servico, data, hora, preco, forma_pagamento, 'Lucas' as barber FROM agendamentos WHERE data BETWEEN ? AND ? AND status = 'Confirmado' ORDER BY data DESC, hora DESC`;
    } else {
      listQuery = `SELECT cliente_nome, servico, data, hora, preco, forma_pagamento, 'Yuri' as barber FROM agendamentos_yuri WHERE data BETWEEN ? AND ? AND status = 'Confirmado' ORDER BY data DESC, hora DESC`;
    }
    const agendamentos = await all(listQuery, [dIni, dFim]);

    // 5. Top Clientes
    let clientsQuery = "";
    if (barber === 'Geral') {
      clientsQuery = `SELECT cliente_nome as name, COUNT(*) as visits, SUM(COALESCE(preco, 0)) / 100 as spent FROM (SELECT cliente_nome, preco, status, data FROM agendamentos UNION ALL SELECT cliente_nome, preco, status, data FROM agendamentos_yuri) WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY cliente_nome ORDER BY spent DESC LIMIT 10`;
    } else if (barber === 'Lucas') {
      clientsQuery = `SELECT cliente_nome as name, COUNT(*) as visits, SUM(COALESCE(preco, 0)) / 100 as spent FROM agendamentos WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY cliente_nome ORDER BY spent DESC LIMIT 10`;
    } else {
      clientsQuery = `SELECT cliente_nome as name, COUNT(*) as visits, SUM(COALESCE(preco, 0)) / 100 as spent FROM agendamentos_yuri WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY cliente_nome ORDER BY spent DESC LIMIT 10`;
    }
    const topClients = await all(clientsQuery, [dIni, dFim]);

    res.json({ by_service: byService, receita_detalhada: receitaDet, by_payment: byPayment, agendamentos, top_clients: topClients });
  } catch (error) {
    console.error('Erro em /resumo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    // INJEÇÃO DA MANUS: Variável para descobrir quem está logado
    const isYuri = req.user.role === 'yuri';
    
    // NOSSA LÓGICA DE FUSO E MATEMÁTICA DO DASHBOARD
    const { dataStr: hojeStr, horaStr: agoraHora } = getBrasiliaTime();
    
    const amanhaData = new Date();
    amanhaData.setDate(amanhaData.getDate() + 1);
    const amanhaStr = amanhaData.toISOString().split('T')[0];

    // INJEÇÃO DA MANUS: Buscar agendamentos limitados ou totais dependendo de quem logou
    let agendamentosFuturos;
    if (isYuri) {
      agendamentosFuturos = await all(`
        SELECT id, cliente_nome, servico, data, hora, status, preco, 'Yuri' as barber FROM agendamentos_yuri 
        WHERE status != 'Cancelado' AND (
          (data = ? AND hora > ?) OR 
          (data = ? AND hora <= ?)
        ) ORDER BY data ASC, hora ASC
      `, [hojeStr, agoraHora, amanhaStr, agoraHora]);
    } else {
      agendamentosFuturos = await all(`
        SELECT * FROM (
          SELECT id, cliente_nome, servico, data, hora, status, preco, 'Lucas' as barber FROM agendamentos 
          WHERE status != 'Cancelado' AND (
            (data = ? AND hora > ?) OR 
            (data = ? AND hora <= ?)
          )
          UNION ALL
          SELECT id, cliente_nome, servico, data, hora, status, preco, 'Yuri' as barber FROM agendamentos_yuri 
          WHERE status != 'Cancelado' AND (
            (data = ? AND hora > ?) OR 
            (data = ? AND hora <= ?)
          )
        ) ORDER BY data ASC, hora ASC
      `, [hojeStr, agoraHora, amanhaStr, agoraHora, hojeStr, agoraHora, amanhaStr, agoraHora]);
    }

    // INJEÇÃO DA MANUS: Estatísticas limitadas ou totais dependendo de quem logou
    let stats;
    if (isYuri) {
      stats = await get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Confirmado' THEN COALESCE(preco, 0) ELSE 0 END) as revenue,
          SUM(CASE WHEN hora <= ? THEN 1 ELSE 0 END) as realized,
          SUM(CASE WHEN hora > ? AND status = 'Pendente' THEN 1 ELSE 0 END) as pending_future
        FROM agendamentos_yuri WHERE data = ? AND status != 'Cancelado'
      `, [agoraHora, agoraHora, hojeStr]);
    } else {
      stats = await get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Confirmado' THEN COALESCE(preco, 0) ELSE 0 END) as revenue,
          SUM(CASE WHEN hora <= ? THEN 1 ELSE 0 END) as realized,
          SUM(CASE WHEN hora > ? AND status = 'Pendente' THEN 1 ELSE 0 END) as pending_future
        FROM (
          SELECT status, preco, data, hora FROM agendamentos WHERE data = ? AND status != 'Cancelado'
          UNION ALL
          SELECT status, preco, data, hora FROM agendamentos_yuri WHERE data = ? AND status != 'Cancelado'
        )
      `, [agoraHora, agoraHora, hojeStr, hojeStr]);
    }

    res.json({
      atendimentosHoje: stats.total || 0,
      receitaDia: (stats.revenue || 0) / 100,
      servicosRealizados: stats.realized || 0,
      pendentesFuturos: stats.pending_future || 0,
      agendamentos: agendamentosFuturos,
      agoraHora
    });
  } catch (error) {
    console.error('Erro em /dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
