import express from 'express';
import { all, get } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Função auxiliar para obter a data e hora atual em Brasília (GMT-3)
function getHojeEAgoraEmBrasilia() {
  // Cria um objeto Date com o horário atual
  const agora = new Date();
  
  // Converte para string ISO e depois ajusta para Brasília (GMT-3)
  // Brasília está 3 horas atrás de UTC
  const offset = -3 * 60 * 60 * 1000; // -3 horas em milissegundos
  const agoraBrasilia = new Date(agora.getTime() + offset);
  
  // Extrai a data em formato YYYY-MM-DD
  const hoje = agoraBrasilia.toISOString().split('T')[0];
  
  // Extrai a hora em formato HH:MM
  const agoraHora = agoraBrasilia.toISOString().split('T')[1].substring(0, 5);
  
  // Calcula amanhã
  const amanhaDate = new Date(agoraBrasilia);
  amanhaDate.setDate(amanhaDate.getDate() + 1);
  const amanha = amanhaDate.toISOString().split('T')[0];
  
  console.log(`[Dashboard] Data/Hora Brasília - Hoje: ${hoje}, Agora: ${agoraHora}, Amanhã: ${amanha}`);
  
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
          const ontem = new Date(hoje);
          ontem.setDate(ontem.getDate() - 1);
          dataInicio = ontem.toISOString().split('T')[0];
          break;
        case 'semana': 
          const semanaAtras = new Date(hoje);
          semanaAtras.setDate(semanaAtras.getDate() - 7);
          dataInicio = semanaAtras.toISOString().split('T')[0];
          break;
        case 'ano': 
          const anoAtras = new Date(hoje);
          anoAtras.setFullYear(anoAtras.getFullYear() - 1);
          dataInicio = anoAtras.toISOString().split('T')[0];
          break;
        default: // mes
          const mesAtras = new Date(hoje);
          mesAtras.setMonth(mesAtras.getMonth() - 1);
          dataInicio = mesAtras.toISOString().split('T')[0];
      }
      dIni = dataInicio;
      dFim = hoje;
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
    const { hoje, agoraHora, amanha } = getHojeEAgoraEmBrasilia();

    console.log(`[Dashboard] Processando com Hoje=${hoje}, Agora=${agoraHora}, Amanhã=${amanha}`);

    // ============================================================================
    // PARTE 1: DADOS HISTÓRICOS (Hoje de 00:00 até agora)
    // ============================================================================
    
    // Total de agendamentos de hoje (00:00 às 23:59) - TODOS os agendamentos do dia
    const totalHojeResult = await get(`
      SELECT COUNT(*) as total_dia
      FROM (
        SELECT id FROM agendamentos WHERE data = ? AND status != 'Cancelado'
        UNION ALL
        SELECT id FROM agendamentos_yuri WHERE data = ? AND status != 'Cancelado'
      )
    `, [hoje, hoje]);
    const atendimentosHoje = totalHojeResult ? totalHojeResult.total_dia : 0;
    console.log(`[Dashboard] Total agendamentos hoje: ${atendimentosHoje}`);

    // Agendamentos realizados (hora já passou) e receita confirmada (00:00 até agora)
    // Comparação de hora como string: "14:30" < "15:00"
    const statsRealizadosResult = await get(`
      SELECT 
        COUNT(*) as realizados,
        SUM(CASE WHEN status = 'Confirmado' THEN COALESCE(preco, 0) ELSE 0 END) as receita_realizada
      FROM (
        SELECT status, preco, data, hora FROM agendamentos 
        WHERE data = ? AND status != 'Cancelado' AND hora < ?
        UNION ALL
        SELECT status, preco, data, hora FROM agendamentos_yuri 
        WHERE data = ? AND status != 'Cancelado' AND hora < ?
      )
    `, [hoje, agoraHora, hoje, agoraHora]);
    const servicosRealizados = statsRealizadosResult ? statsRealizadosResult.realizados : 0;
    const receitaDia = statsRealizadosResult ? (statsRealizadosResult.receita_realizada || 0) / 100 : 0;
    console.log(`[Dashboard] Serviços Realizados: ${servicosRealizados}, Receita: R$ ${receitaDia}`);

    // ============================================================================
    // PARTE 2: DADOS FUTUROS (Próximas 24h a partir de agora)
    // ============================================================================
    // Busca todos os agendamentos de hoje e amanhã (exceto cancelados)
    const todosAgendamentos = await all(`
      SELECT id, cliente_nome, servico, data, hora, status, preco, 'Lucas' as barber 
      FROM agendamentos 
      WHERE status != 'Cancelado' AND (data = ? OR data = ?)
      UNION ALL
      SELECT id, cliente_nome, servico, data, hora, status, preco, 'Yuri' as barber 
      FROM agendamentos_yuri 
      WHERE status != 'Cancelado' AND (data = ? OR data = ?)
      ORDER BY data ASC, hora ASC
    `, [hoje, amanha, hoje, amanha]);

    console.log(`[Dashboard] Total de agendamentos (hoje + amanhã): ${todosAgendamentos.length}`);

    // Filtra apenas os agendamentos FUTUROS (próximas 24h a partir de agora)
    const agendamentos24h = todosAgendamentos.filter(a => {
      // Para hoje: hora DEVE SER ESTRITAMENTE MAIOR que a hora atual
      if (a.data === hoje) {
        const isFuture = a.hora > agoraHora;
        console.log(`[Dashboard] Hoje ${a.cliente_nome} ${a.hora}: ${isFuture ? 'FUTURO' : 'PASSADO'}`);
        return isFuture;
      }
      // Para amanhã: TODOS os agendamentos de amanhã são futuros (próximas 24h)
      if (a.data === amanha) {
        console.log(`[Dashboard] Amanhã ${a.cliente_nome} ${a.hora}: FUTURO`);
        return true;
      }
      return false;
    });

    const servicosAguardando = agendamentos24h.length;
    console.log(`[Dashboard] Agendamentos nas próximas 24h: ${servicosAguardando}`);

    res.json({
      atendimentosHoje,
      receitaDia,
      servicosRealizados,
      servicosAguardando,
      agendamentos: agendamentos24h,
      agoraHora,
      hoje,
      amanha
    });
  } catch (error) {
    console.error('Erro em /dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
