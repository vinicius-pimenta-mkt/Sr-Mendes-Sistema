import express from 'express';
import { all, get } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

const getBrasiliaTime = () => {
  const agora = new Date();
  const brasiliaOffset = -3;
  const utc = agora.getTime() + (agora.getTimezoneOffset() * 60000);
  const dataBrasilia = new Date(utc + (3600000 * brasiliaOffset));
  
  const dataStr = dataBrasilia.toISOString().split('T')[0];
  const horaStr = dataBrasilia.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });
  
  return { dataStr, horaStr, dataBrasilia };
};

const padronizarPagamento = (forma) => {
  if (!forma) return 'Não informado';
  const limpo = forma.toLowerCase().trim().replace(/\./g, '');
  
  if (limpo.includes('crédito') || limpo.includes('credito')) return 'Cartão de Crédito';
  if (limpo.includes('débito') || limpo.includes('debito')) return 'Cartão de Débito';
  if (limpo.includes('dinheiro')) return 'Dinheiro';
  if (limpo.includes('pix')) return 'Pix';
  
  return 'Outros';
};

router.get('/resumo', verifyToken, async (req, res) => {
  try {
    let { periodo = 'mes', data_inicio, data_fim, barber = 'Geral' } = req.query;
    
    if (req.user.role === 'yuri') barber = 'Yuri';

    let dIni, dFim;
    const { dataStr: hojeStr, horaStr: agoraHora, dataBrasilia: hoje } = getBrasiliaTime();
    
    if (data_inicio && data_fim) {
      dIni = data_inicio;
      dFim = data_fim;
    } else {
      let dataInicio;
      switch (periodo) {
        case 'hoje': dataInicio = hoje; break;
        case 'ontem': dataInicio = new Date(hoje); dataInicio.setDate(hoje.getDate() - 1); break;
        case 'semana': dataInicio = new Date(hoje); dataInicio.setDate(hoje.getDate() - 7); break;
        case 'ano': dataInicio = new Date(hoje); dataInicio.setFullYear(hoje.getFullYear() - 1); break;
        default: dataInicio = new Date(hoje); dataInicio.setMonth(hoje.getMonth() - 1);
      }
      dIni = dataInicio.toISOString().split('T')[0];
      dFim = hojeStr;
    }
    
    const timeCondition = `status NOT IN ('Cancelado', 'Bloqueado') AND (data < ? OR (data = ? AND hora <= ?))`;
    const timeParams = [hojeStr, hojeStr, agoraHora];

    // 1. Serviços por Barbeiro
    let rawServices = [];
    if (barber === 'Geral' || barber === 'Lucas') {
      const sLucas = await all(`SELECT servico, 'Lucas' as barber, COUNT(*) as qty, SUM(COALESCE(preco, 0)) as revenue FROM agendamentos WHERE data BETWEEN ? AND ? AND ${timeCondition} GROUP BY servico`, [dIni, dFim, ...timeParams]);
      rawServices = [...rawServices, ...sLucas];
    }
    if (barber === 'Geral' || barber === 'Yuri') {
      const sYuri = await all(`SELECT servico, 'Yuri' as barber, COUNT(*) as qty, SUM(COALESCE(preco, 0)) as revenue FROM agendamentos_yuri WHERE data BETWEEN ? AND ? AND ${timeCondition} GROUP BY servico`, [dIni, dFim, ...timeParams]);
      rawServices = [...rawServices, ...sYuri];
    }

    const serviceMap = {};
    rawServices.forEach(s => {
      if (!serviceMap[s.servico]) serviceMap[s.servico] = { service: s.servico, lucas_qty: 0, yuri_qty: 0, total_qty: 0, revenue: 0 };
      if (s.barber === 'Lucas') serviceMap[s.servico].lucas_qty += s.qty;
      else serviceMap[s.servico].yuri_qty += s.qty;
      serviceMap[s.servico].total_qty += s.qty;
      serviceMap[s.servico].revenue += s.revenue / 100;
    });

    const byService = Object.values(serviceMap).sort((a, b) => b.total_qty - a.total_qty);

    // 2. Evolução da Receita (SOMENTE SERVIÇOS AGORA)
    const isToday = dIni === dFim && dIni === hojeStr;
    let revenueQuery = "";
    let rawRevenue = [];

    if (isToday) {
      if (barber === 'Geral') {
        revenueQuery = `SELECT substr(hora, 1, 2) || ':00' as periodo, SUM(COALESCE(preco, 0)) as total FROM (SELECT data, hora, preco, status FROM agendamentos UNION ALL SELECT data, hora, preco, status FROM agendamentos_yuri) WHERE data = ? AND status NOT IN ('Cancelado', 'Bloqueado') AND hora <= ? GROUP BY periodo ORDER BY periodo`;
      } else if (barber === 'Lucas') {
        revenueQuery = `SELECT substr(hora, 1, 2) || ':00' as periodo, SUM(COALESCE(preco, 0)) as total FROM agendamentos WHERE data = ? AND status NOT IN ('Cancelado', 'Bloqueado') AND hora <= ? GROUP BY periodo ORDER BY periodo`;
      } else {
        revenueQuery = `SELECT substr(hora, 1, 2) || ':00' as periodo, SUM(COALESCE(preco, 0)) as total FROM agendamentos_yuri WHERE data = ? AND status NOT IN ('Cancelado', 'Bloqueado') AND hora <= ? GROUP BY periodo ORDER BY periodo`;
      }
      rawRevenue = await all(revenueQuery, [dIni, agoraHora]);
    } else {
      if (barber === 'Geral') {
        revenueQuery = `SELECT data as periodo, SUM(COALESCE(preco, 0)) as total FROM (SELECT data, preco, status, hora FROM agendamentos UNION ALL SELECT data, preco, status, hora FROM agendamentos_yuri) WHERE data BETWEEN ? AND ? AND ${timeCondition} GROUP BY data ORDER BY data`;
      } else if (barber === 'Lucas') {
        revenueQuery = `SELECT data as periodo, SUM(COALESCE(preco, 0)) as total FROM agendamentos WHERE data BETWEEN ? AND ? AND ${timeCondition} GROUP BY data ORDER BY data`;
      } else {
        revenueQuery = `SELECT data as periodo, SUM(COALESCE(preco, 0)) as total FROM agendamentos_yuri WHERE data BETWEEN ? AND ? AND ${timeCondition} GROUP BY data ORDER BY data`;
      }
      rawRevenue = await all(revenueQuery, [dIni, dFim, ...timeParams]);
    }

    const receitaDetMap = {};
    rawRevenue.forEach(r => {
      const per = isToday ? r.periodo : r.periodo.split('-').reverse().join('/');
      receitaDetMap[per] = (r.total || 0) / 100;
    });

    // 3. Receita por Meio de Pagamento (SOMENTE SERVIÇOS AGORA)
    let paymentsQuery = "";
    if (barber === 'Geral') {
      paymentsQuery = `SELECT forma_pagamento, SUM(COALESCE(preco, 0)) as total, COUNT(*) as qty FROM (SELECT forma_pagamento, preco, status, data, hora FROM agendamentos UNION ALL SELECT forma_pagamento, preco, status, data, hora FROM agendamentos_yuri) WHERE data BETWEEN ? AND ? AND ${timeCondition} GROUP BY forma_pagamento`;
    } else if (barber === 'Lucas') {
      paymentsQuery = `SELECT forma_pagamento, SUM(COALESCE(preco, 0)) as total, COUNT(*) as qty FROM agendamentos WHERE data BETWEEN ? AND ? AND ${timeCondition} GROUP BY forma_pagamento`;
    } else {
      paymentsQuery = `SELECT forma_pagamento, SUM(COALESCE(preco, 0)) as total, COUNT(*) as qty FROM agendamentos_yuri WHERE data BETWEEN ? AND ? AND ${timeCondition} GROUP BY forma_pagamento`;
    }
    const rawPayments = await all(paymentsQuery, [dIni, dFim, ...timeParams]);
    
    const byPaymentMap = {};
    rawPayments.forEach(p => {
      const formaPadronizada = padronizarPagamento(p.forma_pagamento);
      if (byPaymentMap[formaPadronizada]) {
        byPaymentMap[formaPadronizada].valor += (p.total || 0) / 100;
        byPaymentMap[formaPadronizada].quantidade += p.qty;
      } else {
        byPaymentMap[formaPadronizada] = { valor: (p.total || 0) / 100, quantidade: p.qty };
      }
    });

    // =========================================================
    // 4. VENDAS DE PRODUTOS (SEPARADOS DO FATURAMENTO GERAL)
    // =========================================================
    const productSales = await all(`
      SELECT p.nome as service, h.quantidade as qty, h.valor_total as revenue, h.forma_pagamento
      FROM produtos_historico h JOIN produtos p ON h.produto_id = p.id
      WHERE h.tipo = 'venda' AND h.data BETWEEN ? AND ?
    `, [dIni, dFim]);

    const prodTableMap = {};
    productSales.forEach(ps => {
      const formaPadronizada = padronizarPagamento(ps.forma_pagamento);
      // Cria uma chave única juntando o nome do produto e a forma de pagamento
      const key = `${ps.service}_${formaPadronizada}`;
      
      if(!prodTableMap[key]) {
        prodTableMap[key] = { produto: ps.service, forma_pagamento: formaPadronizada, qty: 0, revenue: 0 };
      }
      prodTableMap[key].qty += ps.qty;
      prodTableMap[key].revenue += ps.revenue / 100;
    });

    const receitaDet = Object.keys(receitaDetMap)
      .map(k => ({ periodo: k, valor: receitaDetMap[k] }))
      .sort((a,b) => {
        if(isToday) return a.periodo.localeCompare(b.periodo);
        const [d1,m1,y1] = a.periodo.split('/');
        const [d2,m2,y2] = b.periodo.split('/');
        return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
      });
      
    const byPayment = Object.keys(byPaymentMap).map(k => ({ forma: k, valor: byPaymentMap[k].valor, quantidade: byPaymentMap[k].quantidade })).sort((a,b) => b.valor - a.valor);
    const produtosVendidos = Object.values(prodTableMap).sort((a,b) => b.revenue - a.revenue);
    // =========================================================

    // 5. Lista de Agendamentos do Relatório
    let listQuery = "";
    if (barber === 'Geral') {
      listQuery = `SELECT cliente_nome, servico, data, hora, preco, forma_pagamento, barber FROM (SELECT cliente_nome, servico, data, hora, preco, forma_pagamento, 'Lucas' as barber, status FROM agendamentos UNION ALL SELECT cliente_nome, servico, data, hora, preco, forma_pagamento, 'Yuri' as barber, status FROM agendamentos_yuri) WHERE data BETWEEN ? AND ? AND ${timeCondition} ORDER BY data DESC, hora DESC`;
    } else if (barber === 'Lucas') {
      listQuery = `SELECT cliente_nome, servico, data, hora, preco, forma_pagamento, 'Lucas' as barber FROM agendamentos WHERE data BETWEEN ? AND ? AND ${timeCondition} ORDER BY data DESC, hora DESC`;
    } else {
      listQuery = `SELECT cliente_nome, servico, data, hora, preco, forma_pagamento, 'Yuri' as barber FROM agendamentos_yuri WHERE data BETWEEN ? AND ? AND ${timeCondition} ORDER BY data DESC, hora DESC`;
    }
    const agendamentos = await all(listQuery, [dIni, dFim, ...timeParams]);

    // 6. Top Clientes
    let clientsQuery = "";
    if (barber === 'Geral') {
      clientsQuery = `SELECT cliente_nome as name, COUNT(*) as visits, SUM(COALESCE(preco, 0)) / 100 as spent FROM (SELECT cliente_nome, preco, status, data, hora FROM agendamentos UNION ALL SELECT cliente_nome, preco, status, data, hora FROM agendamentos_yuri) WHERE data BETWEEN ? AND ? AND ${timeCondition} GROUP BY cliente_nome ORDER BY spent DESC LIMIT 10`;
    } else if (barber === 'Lucas') {
      clientsQuery = `SELECT cliente_nome as name, COUNT(*) as visits, SUM(COALESCE(preco, 0)) / 100 as spent FROM agendamentos WHERE data BETWEEN ? AND ? AND ${timeCondition} GROUP BY cliente_nome ORDER BY spent DESC LIMIT 10`;
    } else {
      clientsQuery = `SELECT cliente_nome as name, COUNT(*) as visits, SUM(COALESCE(preco, 0)) / 100 as spent FROM agendamentos_yuri WHERE data BETWEEN ? AND ? AND ${timeCondition} GROUP BY cliente_nome ORDER BY spent DESC LIMIT 10`;
    }
    const topClients = await all(clientsQuery, [dIni, dFim, ...timeParams]);

    res.json({ by_service: byService, receita_detalhada: receitaDet, by_payment: byPayment, agendamentos, top_clients: topClients, produtos_vendidos: produtosVendidos });
  } catch (error) {
    console.error('Erro em /resumo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const isYuri = req.user.role === 'yuri';
    const { dataStr: hojeStr, horaStr: agoraHora } = getBrasiliaTime();
    
    const amanhaData = new Date(); amanhaData.setDate(amanhaData.getDate() + 1);
    const amanhaStr = amanhaData.toISOString().split('T')[0];

    let agendamentosFuturos;
    if (isYuri) {
      agendamentosFuturos = await all(`
        SELECT id, cliente_nome, servico, data, hora, status, preco, 'Yuri' as barber FROM agendamentos_yuri 
        WHERE status NOT IN ('Cancelado', 'Bloqueado') AND ((data = ? AND hora > ?) OR (data = ? AND hora <= ?)) ORDER BY data ASC, hora ASC
      `, [hojeStr, agoraHora, amanhaStr, agoraHora]);
    } else {
      agendamentosFuturos = await all(`
        SELECT * FROM (
          SELECT id, cliente_nome, servico, data, hora, status, preco, 'Lucas' as barber FROM agendamentos WHERE status NOT IN ('Cancelado', 'Bloqueado') AND ((data = ? AND hora > ?) OR (data = ? AND hora <= ?))
          UNION ALL
          SELECT id, cliente_nome, servico, data, hora, status, preco, 'Yuri' as barber FROM agendamentos_yuri WHERE status NOT IN ('Cancelado', 'Bloqueado') AND ((data = ? AND hora > ?) OR (data = ? AND hora <= ?))
        ) ORDER BY data ASC, hora ASC
      `, [hojeStr, agoraHora, amanhaStr, agoraHora, hojeStr, agoraHora, amanhaStr, agoraHora]);
    }

    let stats;
    if (isYuri) {
      stats = await get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN hora <= ? THEN COALESCE(preco, 0) ELSE 0 END) as revenue,
          SUM(CASE WHEN hora <= ? THEN 1 ELSE 0 END) as realized,
          SUM(CASE WHEN hora > ? THEN 1 ELSE 0 END) as pending_future
        FROM agendamentos_yuri 
        WHERE data = ? AND status NOT IN ('Cancelado', 'Bloqueado')
      `, [agoraHora, agoraHora, agoraHora, hojeStr]);
    } else {
      stats = await get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN hora <= ? THEN COALESCE(preco, 0) ELSE 0 END) as revenue,
          SUM(CASE WHEN hora <= ? THEN 1 ELSE 0 END) as realized,
          SUM(CASE WHEN hora > ? THEN 1 ELSE 0 END) as pending_future
        FROM (
          SELECT status, preco, data, hora FROM agendamentos WHERE data = ? AND status NOT IN ('Cancelado', 'Bloqueado')
          UNION ALL
          SELECT status, preco, data, hora FROM agendamentos_yuri WHERE data = ? AND status NOT IN ('Cancelado', 'Bloqueado')
        )
      `, [agoraHora, agoraHora, agoraHora, hojeStr, hojeStr]);
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
