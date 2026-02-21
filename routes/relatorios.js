import express from 'express';
import { all, get } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Função para obter data e hora em Brasília (GMT-3)
function getHojeEAgoraEmBrasilia() {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const agora = new Date();
  const partes = formatter.formatToParts(agora);
  
  const ano = partes.find(p => p.type === 'year').value;
  const mes = partes.find(p => p.type === 'month').value;
  const dia = partes.find(p => p.type === 'day').value;
  const hora = partes.find(p => p.type === 'hour').value;
  const minuto = partes.find(p => p.type === 'minute').value;

  const hoje = `${ano}-${mes}-${dia}`;
  const agoraHora = `${hora}:${minuto}`;

  // Calcula amanhã
  const hojeDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);
  const amanhaDate = new Date(hojeDate);
  amanhaDate.setDate(amanhaDate.getDate() + 1);
  const amanhaMes = String(amanhaDate.getMonth() + 1).padStart(2, '0');
  const amanhaDia = String(amanhaDate.getDate()).padStart(2, '0');
  const amanha = `${ano}-${amanhaMes}-${amanhaDia}`;

  console.log(`[Dashboard] Brasília - Hoje: ${hoje}, Agora: ${agoraHora}, Amanhã: ${amanha}`);

  return { hoje, agoraHora, amanha };
}

router.get('/resumo', verifyToken, async (req, res) => {
  try {
    const { periodo = 'mes', data_inicio, data_fim, barber = 'Geral' } = req.query;
    let dIni, dFim;
    const { hoje } = getHojeEAgoraEmBrasilia();
    
    if (data_inicio && data_fim) {
      dIni = data_inicio;
      dFim = data_fim;
    } else {
      let dataInicio;
      switch (periodo) {
        case 'hoje': dataInicio = hoje; break;
        case 'ontem': 
          const ontemDate = new Date(hoje);
          ontemDate.setDate(ontemDate.getDate() - 1);
          dataInicio = ontemDate.toISOString().split('T')[0];
          break;
        case 'semana': 
          const semanaAtrasDate = new Date(hoje);
          semanaAtrasDate.setDate(semanaAtrasDate.getDate() - 7);
          dataInicio = semanaAtrasDate.toISOString().split('T')[0];
          break;
        case 'ano': 
          const anoAtrasDate = new Date(hoje);
          anoAtrasDate.setFullYear(anoAtrasDate.getFullYear() - 1);
          dataInicio = anoAtrasDate.toISOString().split('T')[0];
          break;
        default: // mes
          const mesAtrasDate = new Date(hoje);
          mesAtrasDate.setMonth(mesAtrasDate.getMonth() - 1);
          dataInicio = mesAtrasDate.toISOString().split('T')[0];
      }
      dIni = dataInicio;
      dFim = hoje;
    }
    
    // 1. Serviços por Barbeiro
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
    const isToday = dIni === dFim && dIni === hoje;
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
    const { hoje, agoraHora, amanha } = getHojeEAgoraEmBrasilia();

    console.log(`[Dashboard] Brasília - Hoje: ${hoje}, Agora: ${agoraHora}, Amanhã: ${amanha}`);

    // ============================================================================
    // BUSCA TODOS OS AGENDAMENTOS DE HOJE E AMANHÃ (SEM FILTRO DE STATUS)
    // ============================================================================
    const todosAgendamentos = await all(`
      SELECT id, cliente_nome, servico, data, hora, status, preco, 'Lucas' as barber 
      FROM agendamentos 
      WHERE data = ? OR data = ?
      UNION ALL
      SELECT id, cliente_nome, servico, data, hora, status, preco, 'Yuri' as barber 
      FROM agendamentos_yuri 
      WHERE data = ? OR data = ?
      ORDER BY data ASC, hora ASC
    `, [hoje, amanha, hoje, amanha]);

    console.log(`[Dashboard] Total de agendamentos (hoje + amanhã): ${todosAgendamentos.length}`);

    // ============================================================================
    // SEPARA AGENDAMENTOS POR PERÍODO
    // ============================================================================
    
    // Agendamentos de hoje que já passaram
    const agendamentosPassadosHoje = todosAgendamentos.filter(a => 
      a.data === hoje && a.hora < agoraHora
    );

    // Agendamentos de hoje que ainda vão acontecer
    const agendamentosFuturosHoje = todosAgendamentos.filter(a => 
      a.data === hoje && a.hora >= agoraHora
    );

    // Agendamentos de amanhã
    const agendamentosAmanha = todosAgendamentos.filter(a => 
      a.data === amanha
    );

    // ============================================================================
    // CALCULA ESTATÍSTICAS - DADOS "MASTIGADOS" PARA O FRONTEND
    // ============================================================================
    
    // 1. Total de agendamentos de hoje (00:00 às 23:59)
    const total_hoje = agendamentosPassadosHoje.length + agendamentosFuturosHoje.length;

    // 2. Serviços realizados (agendamentos de hoje que já passaram)
    const servicos_realizados = agendamentosPassadosHoje.length;

    // 3. Receita do dia (soma dos preços dos agendamentos que já passaram)
    const receita_dia = agendamentosPassadosHoje.reduce((sum, a) => sum + (a.preco || 0), 0) / 100;

    // 4. Agendamentos aguardando (próximas 24h: hoje futuro + amanhã)
    const agendamentos_futuros = [...agendamentosFuturosHoje, ...agendamentosAmanha];
    const aguardando = agendamentos_futuros.length;

    console.log(`[Dashboard] total_hoje: ${total_hoje}, servicos_realizados: ${servicos_realizados}, receita_dia: ${receita_dia}, aguardando: ${aguardando}`);

    // ============================================================================
    // PREPARA LISTA DE AGENDAMENTOS FUTUROS COM ETIQUETA DE DATA
    // ============================================================================
    const agendamentos_com_etiqueta = agendamentos_futuros.map(a => ({
      ...a,
      data_label: a.data === hoje ? 'Hoje' : a.data === amanha ? 'Amanhã' : a.data
    }));

    // ============================================================================
    // RESPOSTA JSON - DADOS PRONTOS PARA EXIBIÇÃO
    // ============================================================================
    res.json({
      total_hoje,
      servicos_realizados,
      receita_dia,
      aguardando,
      agendamentos: agendamentos_com_etiqueta,
      hoje,
      amanha,
      agora: agoraHora
    });
  } catch (error) {
    console.error('Erro em /dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
