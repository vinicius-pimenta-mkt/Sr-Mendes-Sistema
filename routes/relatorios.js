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
          dataInicio = hoje;
          dataFim = hoje;
          break;
        case 'ontem':
          dataInicio = new Date(hoje);
          dataInicio.setDate(hoje.getDate() - 1);
          dataFim = new Date(hoje);
          dataFim.setDate(hoje.getDate() - 1);
          break;
        case 'semana':
          dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'ultimos_15_dias':
          dataInicio = new Date(hoje.getTime() - 15 * 24 * 60 * 60 * 1000);
          break;
        case 'trimestre':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, hoje.getDate());
          break;
        case 'semestre':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 6, hoje.getDate());
          break;
        case 'ano':
          dataInicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate());
          break;
        default: // mes
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
      }
      dataFim = hoje; 
    }

    const dataInicioStr = formatDate(dataInicio);
    const dataFimStr = formatDate(dataFim);

    // Buscar serviços mais vendidos
    const servicosMaisVendidos = await all(`
      SELECT 
        servico as service, 
        COUNT(*) as qty, 
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY servico 
      ORDER BY qty DESC 
      LIMIT 10
    `, [dataInicioStr, dataFimStr]);

    // Buscar totais para receita
    const receitaDiariaTotal = await all(`
      SELECT SUM(COALESCE(preco, 0)) as total 
      FROM agendamentos 
      WHERE data = ? AND status = 'Confirmado'
    `, [formatDate(new Date())]); 

    const receitaSemanalTotal = await all(`
      SELECT SUM(COALESCE(preco, 0)) as total 
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
    `, [formatDate(new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000)), formatDate(new Date())]);

    const receitaMensalTotal = await all(`
      SELECT SUM(COALESCE(preco, 0)) as total 
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
    `, [formatDate(new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate())), formatDate(new Date())]);

    // Nova consulta: Receita por hora para o período selecionado
    const receitaPorHora = await all(`
      SELECT 
        strftime('%H:00', hora) as hour,
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY hour
      ORDER BY hour ASC
    `, [dataInicioStr, dataFimStr]);

    // Nova consulta: Receita por dia da semana para o período selecionado
    const receitaPorDiaSemana = await all(`
      SELECT 
        CASE strftime('%w', data)
          WHEN '0' THEN 'Dom'
          WHEN '1' THEN 'Seg'
          WHEN '2' THEN 'Ter'
          WHEN '3' THEN 'Qua'
          WHEN '4' THEN 'Qui'
          WHEN '5' THEN 'Sex'
          WHEN '6' THEN 'Sáb'
        END as day_of_week,
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY day_of_week
      ORDER BY strftime('%w', data) ASC
    `, [dataInicioStr, dataFimStr]);

    // Nova consulta: Receita por semana do mês (4 últimas semanas)
    const receitaPorSemana = await all(`
      SELECT 
        'Semana ' || ((julianday(data) - julianday(date('now', '-4 weeks', 'weekday 1'))) / 7 + 1) as week_number,
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos
      WHERE data BETWEEN date('now', '-4 weeks', 'weekday 1') AND date('now') 
        AND status = 'Confirmado'
      GROUP BY week_number
      ORDER BY week_number ASC
    `);

    // Buscar top clientes
    const topClientes = await all(`
      SELECT 
        cliente_nome as name,
        COUNT(*) as visits,
        MAX(data) as last_visit,
        SUM(COALESCE(preco, 0)) as spent
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY cliente_nome 
      ORDER BY visits DESC, spent DESC
      LIMIT 10
    `, [dataInicioStr, dataFimStr]);

    res.json({
      by_service: servicosMaisVendidos || [],
      totals: {
        daily: receitaDiariaTotal[0]?.total || 0,
        weekly: receitaSemanalTotal[0]?.total || 0,
        monthly: receitaMensalTotal[0]?.total || 0
      },
      revenue_by_hour: receitaPorHora || [],
      revenue_by_day_of_week: receitaPorDiaSemana || [],
      revenue_by_week: receitaPorSemana || [],
      top_clients: topClientes || []
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de relatórios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Novo endpoint: Receita por hora do dia atual
router.get('/receita-por-hora', verifyToken, async (req, res) => {
  try {
    const hoje = formatDate(new Date());
    
    const receitaPorHora = await all(`
      SELECT 
        strftime('%H:00', hora) as hour,
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos
      WHERE data = ? AND status = 'Confirmado'
      GROUP BY hour
      ORDER BY hour ASC
    `, [hoje]);

    // Preencher todas as horas de 8h às 18h
    const horasCompletas = [];
    for (let i = 8; i <= 18; i++) {
      const horaStr = `${i.toString().padStart(2, '0')}:00`;
      const dadosHora = receitaPorHora.find(h => h.hour === horaStr);
      horasCompletas.push({
        hora: horaStr,
        receita: dadosHora ? dadosHora.revenue / 100 : 0
      });
    }

    res.json(horasCompletas);
  } catch (error) {
    console.error('Erro ao buscar receita por hora:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Novo endpoint: Receita por dia da semana
router.get('/receita-por-dia-semana', verifyToken, async (req, res) => {
  try {
    const { periodo = 'semana' } = req.query;
    
    let dataInicio;
    const hoje = new Date();
    
    switch (periodo) {
      case 'semana':
        dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mes':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
        break;
      default:
        dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const receitaPorDia = await all(`
      SELECT 
        CASE strftime('%w', data)
          WHEN '0' THEN 'Dom'
          WHEN '1' THEN 'Seg'
          WHEN '2' THEN 'Ter'
          WHEN '3' THEN 'Qua'
          WHEN '4' THEN 'Qui'
          WHEN '5' THEN 'Sex'
          WHEN '6' THEN 'Sáb'
        END as day_of_week,
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY day_of_week
      ORDER BY strftime('%w', data) ASC
    `, [formatDate(dataInicio), formatDate(hoje)]);

    // Preencher todos os dias da semana
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const diasCompletos = diasSemana.map(dia => {
      const dadosDia = receitaPorDia.find(d => d.day_of_week === dia);
      return {
        dia: dia,
        receita: dadosDia ? dadosDia.revenue / 100 : 0
      };
    });

    res.json(diasCompletos);
  } catch (error) {
    console.error('Erro ao buscar receita por dia da semana:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Novo endpoint: Receita por semana do mês
router.get('/receita-por-semana', verifyToken, async (req, res) => {
  try {
    const receitaPorSemana = await all(`
      SELECT 
        'Semana ' || ((julianday(data) - julianday(date('now', '-4 weeks', 'weekday 1'))) / 7 + 1) as week_number,
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos
      WHERE data BETWEEN date('now', '-4 weeks', 'weekday 1') AND date('now') 
        AND status = 'Confirmado'
      GROUP BY week_number
      ORDER BY week_number ASC
    `);

    // Preencher 4 semanas
    const semanasCompletas = [];
    for (let i = 1; i <= 4; i++) {
      const semanaStr = `Semana ${i}`;
      const dadosSemana = receitaPorSemana.find(s => s.week_number === semanaStr);
      semanasCompletas.push({
        semana: semanaStr,
        receita: dadosSemana ? dadosSemana.revenue / 100 : 0
      });
    }

    res.json(semanasCompletas);
  } catch (error) {
    console.error('Erro ao buscar receita por semana:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Novo endpoint: Receita dos últimos 15 dias
router.get('/receita-ultimos-15-dias', verifyToken, async (req, res) => {
  try {
    const receitaPorDia = await all(`
      SELECT 
        data,
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos
      WHERE data BETWEEN date('now', '-15 days') AND date('now') 
        AND status = 'Confirmado'
      GROUP BY data
      ORDER BY data ASC
    `);

    // Preencher todos os 15 dias
    const diasCompletos = [];
    for (let i = 14; i >= 0; i--) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      const dataStr = formatDate(data);
      const dadosDia = receitaPorDia.find(d => d.data === dataStr);
      
      diasCompletos.push({
        data: dataStr,
        dia: data.getDate(),
        receita: dadosDia ? dadosDia.revenue / 100 : 0
      });
    }

    res.json(diasCompletos);
  } catch (error) {
    console.error('Erro ao buscar receita dos últimos 15 dias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard - dados gerais
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];

    // Buscar dados do dashboard
    const agendamentosHoje = await all('SELECT COUNT(*) as total FROM agendamentos WHERE data = ?', [hoje]);
    const receitaHoje = await all('SELECT SUM(preco) as total FROM agendamentos WHERE data = ? AND status = ?', [hoje, 'Confirmado']);
    const proximosAgendamentos = await all('SELECT * FROM agendamentos WHERE data >= ? ORDER BY data, hora LIMIT 5', [hoje]);
    const servicosRealizados = await all('SELECT COUNT(*) as total FROM agendamentos WHERE data = ? AND status = ?', [hoje, 'Confirmado']);

    res.json({
      atendimentosHoje: agendamentosHoje[0]?.total || 0,
      receitaDia: receitaHoje[0]?.total || 0,
      proximosAgendamentos: proximosAgendamentos.length,
      servicosRealizados: servicosRealizados[0]?.total || 0,
      agendamentos: proximosAgendamentos,
      servicos: []
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório mensal
router.get('/mensal', verifyToken, async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (dataInicio && dataFim) {
      whereClause = 'WHERE data BETWEEN ? AND ?';
      params = [dataInicio, dataFim];
    } else {
      // Último mês por padrão
      const hoje = new Date();
      const umMesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
      whereClause = 'WHERE data BETWEEN ? AND ?';
      params = [formatDate(umMesAtras), formatDate(hoje)];
    }

    const totalAgendamentos = await all(`SELECT COUNT(*) as total FROM agendamentos ${whereClause}`, params);
    const receitaTotal = await all(`SELECT SUM(preco) as total FROM agendamentos ${whereClause} AND status = 'Confirmado'`, params);
    const clientesAtivos = await all(`SELECT COUNT(DISTINCT cliente_nome) as total FROM agendamentos ${whereClause}`, params);
    const servicosMaisRealizados = await all(`
      SELECT servico as nome, COUNT(*) as quantidade 
      FROM agendamentos ${whereClause} 
      GROUP BY servico 
      ORDER BY quantidade DESC 
      LIMIT 5
    `, params);

    res.json({
      totalAgendamentos: totalAgendamentos[0]?.total || 0,
      receitaTotal: receitaTotal[0]?.total || 0,
      clientesAtivos: clientesAtivos[0]?.total || 0,
      servicosMaisRealizados: servicosMaisRealizados
    });
  } catch (error) {
    console.error('Erro ao gerar relatório mensal:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Exportar relatório CSV
router.get('/exportar', verifyToken, async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (dataInicio && dataFim) {
      whereClause = 'WHERE data BETWEEN ? AND ?';
      params = [dataInicio, dataFim];
    }

    const agendamentos = await all(`
      SELECT 
        data, 
        hora, 
        cliente_nome, 
        servico, 
        status, 
        preco,
        observacoes
      FROM agendamentos 
      ${whereClause}
      ORDER BY data, hora
    `, params);

    // Gerar CSV
    let csv = 'Data,Hora,Cliente,Serviço,Status,Preço,Observações\n';
    agendamentos.forEach(agendamento => {
      csv += `${agendamento.data},${agendamento.hora},"${agendamento.cliente_nome}","${agendamento.servico}",${agendamento.status},${agendamento.preco || 0},"${agendamento.observacoes || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio_barbearia.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Webhook para N8N - IMPORTANTE: Endpoint para integração
router.post('/n8n', async (req, res) => {
  try {
    const { tipo, cliente, telefone, servico, data, hora, preco } = req.body;

    console.log('Webhook N8N recebido:', req.body);

    if (tipo === 'novo_agendamento') {
      if (!cliente || !servico || !data || !hora) {
        return res.status(400).json({ error: 'Dados incompletos para agendamento' });
      }

      // Verificar se já existe um cliente com esse nome
      let clienteId = null;
      const clienteExistente = await get('SELECT id FROM clientes WHERE nome = ?', [cliente]);
      
      if (!clienteExistente && telefone) {
        // Criar novo cliente se não existir
        const novoCliente = await query(
          'INSERT INTO clientes (nome, telefone) VALUES (?, ?)',
          [cliente, telefone]
        );
        clienteId = novoCliente.lastID;
      } else if (clienteExistente) {
        clienteId = clienteExistente.id;
      }

      // Converter preço de string para número (remover R$ e vírgulas)
      let precoNumerico = 0;
      if (preco) {
        precoNumerico = parseFloat(preco.toString().replace(/[R$\s,]/g, '').replace(',', '.')) * 100;
      }

      // Criar agendamento
      const result = await query(
        'INSERT INTO agendamentos (cliente_id, cliente_nome, servico, data, hora, status, preco) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [clienteId, cliente, servico, data, hora, 'Pendente', precoNumerico]
      );
      
      res.json({
        id: result.lastID,
        message: 'Agendamento criado com sucesso via N8N',
        agendamento: {
          id: result.lastID,
          cliente_nome: cliente,
          servico,
          data,
          hora,
          status: 'Pendente',
          preco: precoNumerico
        }
      });
    } else {
      res.status(400).json({ error: 'Tipo de operação não suportado' });
    }
  } catch (error) {
    console.error('Erro ao processar webhook N8N:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
