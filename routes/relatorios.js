import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Lista estática de todos os serviços disponíveis
const ALL_SERVICES = [
  'Corte',
  'Barba',
  'Corte e Barba',
  'Sobrancelha',
  'Corte e Sobrancelha',
  'Corte, Barba e Sobrancelha'
];

// Função auxiliar para formatar datas
const formatDate = (date) => date.toISOString().split('T')[0];

// Função auxiliar para calcular datas baseadas no período
const calcularPeriodo = (periodo, dataInicioReq, dataFimReq) => {
  let dataInicio, dataFim;
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999); // Fim do dia atual
  
  if (dataInicioReq && dataFimReq) {
    dataInicio = new Date(dataInicioReq);
    dataFim = new Date(dataFimReq);
    dataFim.setHours(23, 59, 59, 999);
  } else {
    const hojeCopia = new Date();
    hojeCopia.setHours(0, 0, 0, 0); // Início do dia atual
    
    switch (periodo) {
      case 'hoje':
        dataInicio = new Date(hojeCopia);
        dataFim = new Date(hoje);
        break;
      case 'ontem':
        dataInicio = new Date(hojeCopia);
        dataInicio.setDate(hojeCopia.getDate() - 1);
        dataFim = new Date(hojeCopia);
        dataFim.setDate(hojeCopia.getDate() - 1);
        dataFim.setHours(23, 59, 59, 999);
        break;
      case 'semana':
        dataInicio = new Date(hojeCopia);
        dataInicio.setDate(hojeCopia.getDate() - 7);
        dataFim = new Date(hoje);
        break;
      case 'ultimos_15_dias':
        dataInicio = new Date(hojeCopia);
        dataInicio.setDate(hojeCopia.getDate() - 15);
        dataFim = new Date(hoje);
        break;
      case 'trimestre':
        dataInicio = new Date(hojeCopia);
        dataInicio.setMonth(hojeCopia.getMonth() - 3);
        dataFim = new Date(hoje);
        break;
      case 'semestre':
        dataInicio = new Date(hojeCopia);
        dataInicio.setMonth(hojeCopia.getMonth() - 6);
        dataFim = new Date(hoje);
        break;
      case 'ano':
        dataInicio = new Date(hojeCopia);
        dataInicio.setFullYear(hojeCopia.getFullYear() - 1);
        dataFim = new Date(hoje);
        break;
      default: // mes
        dataInicio = new Date(hojeCopia);
        dataInicio.setMonth(hojeCopia.getMonth() - 1);
        dataFim = new Date(hoje);
    }
  }
  
  return { dataInicio, dataFim };
};

// Endpoint resumo - dados para a página de relatórios do frontend
router.get('/resumo', verifyToken, async (req, res) => {
  try {
    const { periodo = 'mes', data_inicio: reqDataInicio, data_fim: reqDataFim } = req.query;
    
    const { dataInicio, dataFim } = calcularPeriodo(periodo, reqDataInicio, reqDataFim);
    const dataInicioStr = formatDate(dataInicio);
    const dataFimStr = formatDate(dataFim);

    // Buscar serviços mais vendidos para o período selecionado
    const servicosConfirmados = await all(`
      SELECT 
        servico as service, 
        COUNT(*) as qty, 
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY servico 
    `, [dataInicioStr, dataFimStr]);

    // Preencher com serviços que não tiveram agendamentos
    const servicosMaisVendidos = ALL_SERVICES.map(serviceName => {
      const found = servicosConfirmados.find(s => s.service === serviceName);
      return {
        service: serviceName,
        qty: found ? found.qty : 0,
        revenue: found ? found.revenue : 0
      };
    }).sort((a, b) => b.qty - a.qty); // Ordenar por quantidade, se houver

    // Buscar totais para receita (sempre calculados dinamicamente)
    const hoje = new Date();
    const hojeCopia = new Date();
    hojeCopia.setHours(0, 0, 0, 0); // Início do dia atual
    
    const receitaDiariaTotal = await all(`
      SELECT SUM(COALESCE(preco, 0)) as total 
      FROM agendamentos 
      WHERE data = ? AND status = 'Confirmado'
    `, [formatDate(hojeCopia)]); 

    const semanaAtras = new Date(hojeCopia);
    semanaAtras.setDate(hojeCopia.getDate() - 7);
    const receitaSemanalTotal = await all(`
      SELECT SUM(COALESCE(preco, 0)) as total 
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
    `, [formatDate(semanaAtras), formatDate(hoje)]);

    const mesAtras = new Date(hojeCopia);
    mesAtras.setMonth(hojeCopia.getMonth() - 1);
    const receitaMensalTotal = await all(`
      SELECT SUM(COALESCE(preco, 0)) as total 
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
    `, [formatDate(mesAtras), formatDate(hoje)]);

    // Receita por hora para o dia atual (sempre do dia atual, independente do período)
    const receitaPorHoraHoje = await all(`
      SELECT 
        strftime('%H:00', hora) as hour,
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos
      WHERE data = ? AND status = 'Confirmado'
      GROUP BY hour
      ORDER BY hour ASC
    `, [formatDate(hojeCopia)]);

    // Receita por dia da semana para o período selecionado
    const receitaPorDiaSemanaRaw = await all(`
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

    // Garantir que todos os dias da semana (Seg-Sáb) estejam presentes
    const diasSemanaOrdem = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const receitaPorDiaSemana = diasSemanaOrdem.map(dia => {
      const found = receitaPorDiaSemanaRaw.find(r => r.day_of_week === dia);
      return {
        day_of_week: dia,
        revenue: found ? found.revenue : 0
      };
    });

    // Receita por semana (últimas 4 semanas) para o período selecionado
    // Ajuste para garantir que sempre retorne 4 semanas, mesmo que vazias
    const receitaPorSemanaRaw = await all(`
      SELECT 
        strftime('%Y-%W', data) as week_id,
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY week_id
      ORDER BY week_id DESC
      LIMIT 4
    `, [dataInicioStr, dataFimStr]);

    const semanasCompletas = [];
    for (let i = 0; i < 4; i++) {
      const weekDate = new Date(dataFim);
      weekDate.setDate(dataFim.getDate() - (i * 7));
      const weekId = `${weekDate.getFullYear()}-${Math.floor((weekDate.getTime() - new Date(weekDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
      const found = receitaPorSemanaRaw.find(s => s.week_id === weekId);
      semanasCompletas.unshift({
        week_label: `Semana ${Math.floor((weekDate.getTime() - new Date(weekDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1}`,
        revenue: found ? found.revenue : 0
      });
    }

    // Buscar top clientes para o período selecionado
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
      revenue_by_hour_today: receitaPorHoraHoje || [],
      revenue_by_day_of_week: receitaPorDiaSemana || [],
      revenue_by_week: semanasCompletas || [],
      top_clients: topClientes || [],
      period_info: {
        start_date: dataInicioStr,
        end_date: dataFimStr,
        period: periodo
      }
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de relatórios:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Novo endpoint específico para receita dos últimos 15 dias
router.get('/receita-ultimos-15-dias', verifyToken, async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    const quinzeDiasAtras = new Date();
    quinzeDiasAtras.setDate(hoje.getDate() - 14); // Corrigido para incluir 15 dias (hoje + 14 anteriores)
    quinzeDiasAtras.setHours(0, 0, 0, 0);

    const receitaPorDiaRaw = await all(`
      SELECT 
        data,
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY data
      ORDER BY data ASC
    `, [formatDate(quinzeDiasAtras), formatDate(hoje)]);

    // Preencher dias sem receita com 0
    const diasCompletos = [];
    for (let i = 0; i < 15; i++) { // Loop para 15 dias
      const dia = new Date(quinzeDiasAtras);
      dia.setDate(quinzeDiasAtras.getDate() + i);
      const diaStr = formatDate(dia);
      const dadosDia = receitaPorDiaRaw.find(r => r.data === diaStr);
      
      diasCompletos.push({
        data: diaStr,
        dia_semana: dia.toLocaleDateString('pt-BR', { weekday: 'short' }),
        receita: dadosDia ? dadosDia.revenue : 0
      });
    }

    res.json({
      receita_por_dia: diasCompletos,
      total_periodo: diasCompletos.reduce((sum, dia) => sum + dia.receita, 0)
    });
  } catch (error) {
    console.error('Erro ao buscar receita dos últimos 15 dias:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
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
    // Verificar se os dados estão no body ou query
    const dados = req.body.tipo ? req.body : req.query;
    const { tipo, cliente, telefone, servico, data, hora, preco } = dados;

    console.log('Webhook N8N recebido:', dados);

    if (tipo === 'novo_agendamento') {
      if (!cliente || !servico || !data || !hora) {
        return res.status(400).json({ error: 'Dados incompletos para agendamento' });
      }

      // Processar o preço - converter de string "R$80,00" para centavos
      let precoEmCentavos = 0;
      if (preco) {
        // Remover "R$" e converter vírgula para ponto, depois multiplicar por 100
        const precoLimpo = preco.replace('R$', '').replace(',', '.').trim();
        const precoFloat = parseFloat(precoLimpo);
        if (!isNaN(precoFloat)) {
          precoEmCentavos = Math.round(precoFloat * 100);
        }
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

      // Criar agendamento com preço
      const result = await query(
        'INSERT INTO agendamentos (cliente_id, cliente_nome, servico, data, hora, status, preco) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [clienteId, cliente, servico, data, hora, 'Pendente', precoEmCentavos]
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
          preco: precoEmCentavos
        }
      });
    } else {
      res.status(400).json({ error: 'Tipo de operação não suportado' });
    }
  } catch (error) {
    console.error('Erro ao processar webhook N8N:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

export default router;

