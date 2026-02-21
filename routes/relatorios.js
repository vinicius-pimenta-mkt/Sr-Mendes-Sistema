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
    
    // 1. Serviços por Barbeiro (Unificação para o Gráfico Geral)
    let rawServices = [];
    if (barber === 'Geral' || barber === 'Lucas') {
      const sLucas = await all(`
        SELECT servico, 'Lucas' as barber, COUNT(*) as qty
        FROM agendamentos 
        WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
        GROUP BY servico
      `, [dIni, dFim]);
      rawServices = [...rawServices, ...sLucas];
    }
    if (barber === 'Geral' || barber === 'Yuri') {
      const sYuri = await all(`
        SELECT servico, 'Yuri' as barber, COUNT(*) as qty
        FROM agendamentos_yuri 
        WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
        GROUP BY servico
      `, [dIni, dFim]);
      rawServices = [...rawServices, ...sYuri];
    }

    // Agrupamento para o Frontend (Estrutura: { service, lucas_qty, yuri_qty, total_qty })
    const serviceMap = {};
    rawServices.forEach(s => {
      if (!serviceMap[s.servico]) {
        serviceMap[s.servico] = { service: s.servico, lucas_qty: 0, yuri_qty: 0, total_qty: 0 };
      }
      if (s.barber === 'Lucas') serviceMap[s.servico].lucas_qty += s.qty;
      else serviceMap[s.servico].yuri_qty += s.qty;
      serviceMap[s.servico].total_qty += s.qty;
    });

    const byService = Object.values(serviceMap).sort((a, b) => b.total_qty - a.total_qty);

    // 2. Evolução da Receita
    const isToday = dIni === dFim && dIni === hoje.toISOString().split('T')[0];
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

    // 4. Lista de Agendamentos (Tabela Detalhada)
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
    // Obter data e hora em fuso horário de Brasília (America/Sao_Paulo)
    const agora = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(agora);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const hoje = `${map.year}-${map.month}-${map.day}`;
    const agoraHora = `${map.hour}:${map.minute}`;
    
    // Calcular amanhã em Brasília
    const amanhaDate = new Date(agora);
    amanhaDate.setDate(amanhaDate.getDate() + 1);
    const formatterAmanha = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    });
    const partsAmanha = formatterAmanha.formatToParts(amanhaDate);
    const mapAmanha = Object.fromEntries(partsAmanha.map(p => [p.type, p.value]));
    const amanhaStr = `${mapAmanha.year}-${mapAmanha.month}-${mapAmanha.day}`;

    // BUSCA DIRETA DA AGENDA (TODOS OS STATUS EXCETO CANCELADO)
    const todosAgendamentos = await all(`
      SELECT * FROM (
        SELECT id, cliente_nome, servico, data, hora, status, preco, 'Lucas' as barber FROM agendamentos 
        WHERE status != 'Cancelado' AND (data = ? OR data = ?)
        UNION ALL
        SELECT id, cliente_nome, servico, data, hora, status, preco, 'Yuri' as barber FROM agendamentos_yuri 
        WHERE status != 'Cancelado' AND (data = ? OR data = ?)
      ) ORDER BY data ASC, hora ASC
    `, [hoje, amanhaStr, hoje, amanhaStr]);

    // FILTRAGEM DE PRÓXIMAS 24 HORAS PARA AS TABELAS
    const agendamentos24h = todosAgendamentos.filter(a => {
      if (a.data === hoje) return a.hora >= agoraHora;
      if (a.data === amanhaStr) return a.hora < agoraHora;
      return false;
    });

    // ESTATÍSTICAS BASEADAS NO TEMPO REAL DE HOJE
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

    // Lógica solicitada: Pendentes = Soma dos agendamentos com status 'Pendente' de Lucas e Yuri nas próximas 24h
    const servicosPendentes = agendamentos24h.filter(a => a.status === 'Pendente').length;
    
    console.log('--- Debug Dashboard ---');
    console.log('Data Hoje (Brasília):', hoje);
    console.log('Hora Agora (Brasília):', agoraHora);
    console.log('Total agendamentos 24h:', agendamentos24h.length);
    console.log('Serviços Pendentes (Aguardando) 24h:', servicosPendentes);
    console.log('-----------------------');

    res.json({
      atendimentosHoje: statsHoje.total_dia || 0,
      receitaDia: (statsHoje.receita_realizada || 0) / 100,
      servicosRealizados: statsHoje.realizados || 0,
      servicosAguardando: servicosPendentes, // Sincronizado com a soma dos pendentes das tabelas abaixo
      agendamentos: agendamentos24h, 
      agoraHora,
      hoje
    });
  } catch (error) {
    console.error('Erro em /dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
