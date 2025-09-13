import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Endpoint resumo - dados para a página de relatórios do frontend
router.get('/resumo', verifyToken, async (req, res) => {
  try {
    const { periodo = 'mes' } = req.query;
    
    // Calcular datas baseado no período
    let dataInicio, dataFim;
    const hoje = new Date();
    
    switch (periodo) {
      case 'semana':
        dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
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
    const dataInicioStr = dataInicio.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    // Buscar serviços mais vendidos
    const servicosMaisVendidos = await all(`
      SELECT 
        servico as service, 
        COUNT(*) as qty, 
        SUM(COALESCE(preco, 0)) * 100 as revenue
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY servico 
      ORDER BY qty DESC 
      LIMIT 10
    `, [dataInicioStr, dataFimStr]);

    // Buscar totais para receita
    const receitaDiaria = await all(`
      SELECT SUM(COALESCE(preco, 0)) as total 
      FROM agendamentos 
      WHERE data = ? AND status = 'Confirmado'
    `, [hoje.toISOString().split('T')[0]]);

    const receitaSemanal = await all(`
      SELECT SUM(COALESCE(preco, 0)) as total 
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
    `, [new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dataFimStr]);

    const receitaMensal = await all(`
      SELECT SUM(COALESCE(preco, 0)) as total 
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
    `, [dataInicioStr, dataFimStr]);

    // Buscar top clientes
    const topClientes = await all(`
      SELECT 
        cliente_nome as name,
        COUNT(*) as visits,
        MAX(data) as last_visit,
        SUM(COALESCE(preco, 0)) * 100 as spent
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY cliente_nome 
      ORDER BY visits DESC, spent DESC
      LIMIT 10
    `, [dataInicioStr, dataFimStr]);

    res.json({
      by_service: servicosMaisVendidos || [],
      totals: {
        daily: receitaDiaria[0]?.total || 0,
        weekly: receitaSemanal[0]?.total || 0,
        monthly: receitaMensal[0]?.total || 0
      },
      top_clients: topClientes || []
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de relatórios:', error);
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
      params = [umMesAtras.toISOString().split('T')[0], hoje.toISOString().split('T')[0]];
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
    const { tipo, cliente, telefone, servico, data, hora } = req.body;

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

      // Criar agendamento
      const result = await query(
        'INSERT INTO agendamentos (cliente_id, cliente_nome, servico, data, hora, status) VALUES (?, ?, ?, ?, ?, ?)',
        [clienteId, cliente, servico, data, hora, 'Pendente']
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
          status: 'Pendente'
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
