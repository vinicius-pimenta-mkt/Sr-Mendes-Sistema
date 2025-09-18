import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Função auxiliar para formatar datas
const formatDate = (date) => date.toISOString().split('T')[0];

// Endpoint resumo - dados para a página de relatórios do frontend
router.get('/resumo', verifyToken, async (req, res) => {
  try {
    const { periodo = 'mes', data_inicio: reqDataInicio, data_fim: reqDataFim } = req.query;
    
    let dataInicio, dataFim;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); 
    
    if (reqDataInicio && reqDataFim) {
      dataInicio = new Date(reqDataInicio);
      dataFim = new Date(reqDataFim);
      dataFim.setHours(23, 59, 59, 999); 
    } else {
      switch (periodo) {
        case 'hoje':
          dataInicio = new Date(hoje);
          dataFim = new Date(hoje);
          dataFim.setHours(23, 59, 59, 999);
          break;
        case 'ontem':
          dataInicio = new Date(hoje);
          dataInicio.setDate(hoje.getDate() - 1);
          dataFim = new Date(hoje);
          dataFim.setDate(hoje.getDate() - 1);
          dataFim.setHours(23, 59, 59, 999);
          break;
        case 'semana':
          dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
          dataFim = new Date(hoje);
          dataFim.setHours(23, 59, 59, 999);
          break;
        case 'ultimos_15_dias':
          dataInicio = new Date(hoje.getTime() - 15 * 24 * 60 * 60 * 1000);
          dataFim = new Date(hoje);
          dataFim.setHours(23, 59, 59, 999);
          break;
        case 'trimestre':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, hoje.getDate());
          dataFim = new Date(hoje);
          dataFim.setHours(23, 59, 59, 999);
          break;
        case 'semestre':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 6, hoje.getDate());
          dataFim = new Date(hoje);
          dataFim.setHours(23, 59, 59, 999);
          break;
        case 'ano':
          dataInicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate());
          dataFim = new Date(hoje);
          dataFim.setHours(23, 59, 59, 999);
          break;
        default: // mes
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
          dataFim = new Date(hoje);
          dataFim.setHours(23, 59, 59, 999);
      }
    }

    console.log(`Buscando dados de ${formatDate(dataInicio)} até ${formatDate(dataFim)} para período: ${periodo}`);

    // Buscar agendamentos no período
    const agendamentos = await all(`
      SELECT 
        a.id,
        a.cliente_nome,
        a.servico,
        a.data_agendamento,
        a.horario,
        a.preco,
        a.status
      FROM agendamentos a
      WHERE DATE(a.data_agendamento) >= ? AND DATE(a.data_agendamento) <= ?
      ORDER BY a.data_agendamento DESC
    `, [formatDate(dataInicio), formatDate(dataFim)]);

    console.log(`Encontrados ${agendamentos.length} agendamentos no período`);

    // Processar dados dos serviços
    const servicosMap = {};
    let receitaTotal = 0;

    agendamentos.forEach(agendamento => {
      const servico = agendamento.servico;
      // Garantir que o preço seja um número
      let preco = 0;
      if (typeof agendamento.preco === 'string') {
        preco = parseFloat(agendamento.preco) || 0;
      } else if (typeof agendamento.preco === 'number') {
        preco = agendamento.preco;
      }

      console.log(`Agendamento: ${servico}, Preço original: ${agendamento.preco}, Preço processado: ${preco}`);

      if (!servicosMap[servico]) {
        servicosMap[servico] = { qty: 0, revenue: 0 };
      }
      servicosMap[servico].qty += 1;
      servicosMap[servico].revenue += preco;
      receitaTotal += preco;
    });

    // Converter para array
    const by_service = Object.entries(servicosMap).map(([service, data]) => ({
      service,
      qty: data.qty,
      revenue: data.revenue
    }));

    console.log('Serviços processados:', by_service);

    // Calcular totais para diferentes períodos (sempre baseado em dados reais)
    const hojeFmt = formatDate(hoje);
    const ontemFmt = formatDate(new Date(hoje.getTime() - 24 * 60 * 60 * 1000));
    const semanaAtrasDate = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    const mesAtrasDate = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());

    // Receita de hoje
    const receitaHoje = await get(`
      SELECT COALESCE(SUM(CAST(preco AS REAL)), 0) as total
      FROM agendamentos 
      WHERE DATE(data_agendamento) = ?
    `, [hojeFmt]);

    // Receita da semana
    const receitaSemana = await get(`
      SELECT COALESCE(SUM(CAST(preco AS REAL)), 0) as total
      FROM agendamentos 
      WHERE DATE(data_agendamento) >= ? AND DATE(data_agendamento) <= ?
    `, [formatDate(semanaAtrasDate), hojeFmt]);

    // Receita do mês
    const receitaMes = await get(`
      SELECT COALESCE(SUM(CAST(preco AS REAL)), 0) as total
      FROM agendamentos 
      WHERE DATE(data_agendamento) >= ? AND DATE(data_agendamento) <= ?
    `, [formatDate(mesAtrasDate), hojeFmt]);

    console.log('Totais calculados:', {
      hoje: receitaHoje?.total || 0,
      semana: receitaSemana?.total || 0,
      mes: receitaMes?.total || 0
    });

    // Top clientes
    const topClientes = await all(`
      SELECT 
        cliente_nome as name,
        COUNT(*) as visits,
        MAX(data_agendamento) as last_visit,
        COALESCE(SUM(CAST(preco AS REAL)), 0) as spent
      FROM agendamentos
      WHERE DATE(data_agendamento) >= ? AND DATE(data_agendamento) <= ?
      GROUP BY cliente_nome
      ORDER BY visits DESC, spent DESC
      LIMIT 10
    `, [formatDate(dataInicio), formatDate(dataFim)]);

    const response = {
      by_service,
      totals: {
        daily: receitaHoje?.total || 0,
        weekly: receitaSemana?.total || 0,
        monthly: receitaMes?.total || 0
      },
      top_clients: topClientes,
      period_info: {
        start: formatDate(dataInicio),
        end: formatDate(dataFim),
        period: periodo,
        total_appointments: agendamentos.length,
        total_revenue: receitaTotal
      }
    };

    console.log('Resposta final:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error('Erro no endpoint resumo:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Endpoint específico para receita por hora do dia atual
router.get('/receita-por-hora', verifyToken, async (req, res) => {
  try {
    const hoje = formatDate(new Date());
    
    const dados = await all(`
      SELECT 
        strftime('%H:00', horario) as hour,
        COALESCE(SUM(CAST(preco AS REAL)), 0) as revenue
      FROM agendamentos
      WHERE DATE(data_agendamento) = ?
      GROUP BY strftime('%H:00', horario)
      ORDER BY hour
    `, [hoje]);

    // Preencher todas as horas de 8h às 18h
    const horasCompletas = [];
    for (let i = 8; i <= 18; i++) {
      const horaStr = `${i.toString().padStart(2, '0')}:00`;
      const dadosHora = dados.find(d => d.hour === horaStr);
      horasCompletas.push({
        hora: horaStr,
        receita: dadosHora ? dadosHora.revenue : 0
      });
    }

    console.log('Receita por hora:', horasCompletas);
    res.json(horasCompletas);

  } catch (error) {
    console.error('Erro ao buscar receita por hora:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint específico para receita por dia da semana
router.get('/receita-por-dia-semana', verifyToken, async (req, res) => {
  try {
    const { periodo = 'semana' } = req.query;
    const hoje = new Date();
    let dataInicio;

    if (periodo === 'semana') {
      dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
    }

    const dados = await all(`
      SELECT 
        CASE strftime('%w', data_agendamento)
          WHEN '0' THEN 'Dom'
          WHEN '1' THEN 'Seg'
          WHEN '2' THEN 'Ter'
          WHEN '3' THEN 'Qua'
          WHEN '4' THEN 'Qui'
          WHEN '5' THEN 'Sex'
          WHEN '6' THEN 'Sáb'
        END as day_of_week,
        COALESCE(SUM(CAST(preco AS REAL)), 0) as revenue
      FROM agendamentos
      WHERE DATE(data_agendamento) >= ? AND DATE(data_agendamento) <= ?
      GROUP BY strftime('%w', data_agendamento)
      ORDER BY strftime('%w', data_agendamento)
    `, [formatDate(dataInicio), formatDate(hoje)]);

    // Preencher todos os dias da semana
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const diasCompletos = diasSemana.map(dia => {
      const dadosDia = dados.find(d => d.day_of_week === dia);
      return {
        dia: dia,
        receita: dadosDia ? dadosDia.revenue : 0
      };
    });

    console.log('Receita por dia da semana:', diasCompletos);
    res.json(diasCompletos);

  } catch (error) {
    console.error('Erro ao buscar receita por dia da semana:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint específico para receita por semana do mês
router.get('/receita-por-semana', verifyToken, async (req, res) => {
  try {
    const hoje = new Date();
    const mesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());

    const dados = await all(`
      SELECT 
        strftime('%W', data_agendamento) as week_number,
        COALESCE(SUM(CAST(preco AS REAL)), 0) as revenue
      FROM agendamentos
      WHERE DATE(data_agendamento) >= ? AND DATE(data_agendamento) <= ?
      GROUP BY strftime('%W', data_agendamento)
      ORDER BY week_number
    `, [formatDate(mesAtras), formatDate(hoje)]);

    const semanas = dados.map(s => ({
      semana: `Semana ${s.week_number}`,
      receita: s.revenue
    }));

    console.log('Receita por semana:', semanas);
    res.json(semanas);

  } catch (error) {
    console.error('Erro ao buscar receita por semana:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint específico para receita dos últimos 15 dias
router.get('/receita-ultimos-15-dias', verifyToken, async (req, res) => {
  try {
    const hoje = new Date();
    const quinzeDiasAtras = new Date(hoje.getTime() - 15 * 24 * 60 * 60 * 1000);

    const dados = await all(`
      SELECT 
        DATE(data_agendamento) as dia,
        COALESCE(SUM(CAST(preco AS REAL)), 0) as receita
      FROM agendamentos
      WHERE DATE(data_agendamento) >= ? AND DATE(data_agendamento) <= ?
      GROUP BY DATE(data_agendamento)
      ORDER BY dia
    `, [formatDate(quinzeDiasAtras), formatDate(hoje)]);

    // Preencher todos os 15 dias
    const diasCompletos = [];
    for (let i = 15; i >= 0; i--) {
      const data = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000);
      const dataStr = formatDate(data);
      const dadosDia = dados.find(d => d.dia === dataStr);
      
      diasCompletos.push({
        dia: dataStr,
        receita: dadosDia ? dadosDia.receita : 0
      });
    }

    console.log('Receita dos últimos 15 dias:', diasCompletos);
    res.json(diasCompletos);

  } catch (error) {
    console.error('Erro ao buscar receita dos últimos 15 dias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Webhook do N8N - CORRIGIDO para salvar preço como número
router.post('/webhook-n8n', async (req, res) => {
  try {
    console.log('Webhook N8N recebido:', JSON.stringify(req.body, null, 2));

    const { 
      cliente_nome, 
      servico, 
      data_agendamento, 
      horario, 
      preco: precoOriginal,
      status = 'confirmado' 
    } = req.body;

    // Validar dados obrigatórios
    if (!cliente_nome || !servico || !data_agendamento || !horario) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios faltando',
        required: ['cliente_nome', 'servico', 'data_agendamento', 'horario']
      });
    }

    // Processar o preço - garantir que seja um número
    let preco = 0;
    if (precoOriginal) {
      if (typeof precoOriginal === 'string') {
        // Remover símbolos e converter para número
        const precoLimpo = precoOriginal.replace(/[R$\s,]/g, '').replace(',', '.');
        preco = parseFloat(precoLimpo) || 0;
      } else if (typeof precoOriginal === 'number') {
        preco = precoOriginal;
      }
    }

    console.log(`Preço processado: ${precoOriginal} -> ${preco}`);

    // Inserir no banco de dados
    const result = await query(`
      INSERT INTO agendamentos (cliente_nome, servico, data_agendamento, horario, preco, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [cliente_nome, servico, data_agendamento, horario, preco, status]);

    console.log('Agendamento salvo com sucesso:', result);

    res.json({ 
      success: true, 
      message: 'Agendamento criado com sucesso',
      id: result.lastID,
      data: {
        cliente_nome,
        servico,
        data_agendamento,
        horario,
        preco,
        status
      }
    });

  } catch (error) {
    console.error('Erro no webhook N8N:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

export default router;
