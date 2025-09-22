import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Endpoint resumo - dados para a página de relatórios do frontend
router.get('/resumo', verifyToken, async (req, res) => {
  try {
    const { periodo = 'mes', data_inicio, data_fim } = req.query;
    
    // Calcular datas baseado no período
    let dataInicio, dataFim;
    const hoje = new Date();
    
    // Se data_inicio e data_fim foram fornecidas, usar elas
    if (data_inicio && data_fim) {
      dataInicio = new Date(data_inicio);
      dataFim = new Date(data_fim);
    } else {
      // Calcular baseado no período
      switch (periodo) {
        case 'hoje':
          dataInicio = new Date(hoje);
          dataFim = new Date(hoje);
          break;
        case 'ontem':
          const ontem = new Date(hoje);
          ontem.setDate(hoje.getDate() - 1);
          dataInicio = new Date(ontem);
          dataFim = new Date(ontem);
          break;
        case 'semana':
          dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
          dataFim = hoje;
          break;
        case 'ultimos15dias':
          dataInicio = new Date(hoje.getTime() - 15 * 24 * 60 * 60 * 1000);
          dataFim = hoje;
          break;
        case 'trimestre':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, hoje.getDate());
          dataFim = hoje;
          break;
        case 'semestre':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 6, hoje.getDate());
          dataFim = hoje;
          break;
        case 'ano':
          dataInicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate());
          dataFim = hoje;
          break;
        default: // mes
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
          dataFim = hoje;
      }
    }
    
    const dataInicioStr = dataInicio.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    // Lista de todos os serviços possíveis
    const todosServicos = await all(`
      SELECT DISTINCT servico 
      FROM agendamentos 
      ORDER BY servico
    `);

    // Buscar serviços mais vendidos no período
    const servicosVendidos = await all(`
      SELECT 
        servico as service, 
        COUNT(*) as qty, 
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY servico 
      ORDER BY qty DESC
    `, [dataInicioStr, dataFimStr]);

    // Criar array com todos os serviços, incluindo os com quantidade 0
    const servicosCompletos = todosServicos.map(servico => {
      const servicoVendido = servicosVendidos.find(s => s.service === servico.servico);
      return {
        service: servico.servico,
        qty: servicoVendido ? servicoVendido.qty : 0,
        revenue: servicoVendido ? servicoVendido.revenue / 100 : 0
      };
    });

    // Dados de receita baseados no período
    let dadosReceita = [];
    
    if (periodo === 'hoje' || (data_inicio && data_fim && dataInicioStr === dataFimStr)) {
      // Receita por hora (8h às 18h)
      for (let hora = 8; hora <= 18; hora++) {
        const horaStr = hora.toString().padStart(2, '0') + ':00';
        const proximaHora = (hora + 1).toString().padStart(2, '0') + ':00';
        
        const receitaHora = await all(`
          SELECT SUM(COALESCE(preco, 0)) as total 
          FROM agendamentos 
          WHERE data = ? AND hora >= ? AND hora < ? AND status = 'Confirmado'
        `, [dataInicioStr, horaStr, proximaHora]);
        
        dadosReceita.push({
          periodo: `${hora}h`,
          valor: (receitaHora[0]?.total || 0) / 100
        });
      }
    } else if (periodo === 'semana') {
      // Receita por dia da semana (segunda a sábado)
      const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1); // Segunda-feira
      
      for (let i = 0; i < 6; i++) {
        const dia = new Date(inicioSemana);
        dia.setDate(inicioSemana.getDate() + i);
        const diaStr = dia.toISOString().split('T')[0];
        
        const receitaDia = await all(`
          SELECT SUM(COALESCE(preco, 0)) as total 
          FROM agendamentos 
          WHERE data = ? AND status = 'Confirmado'
        `, [diaStr]);
        
        dadosReceita.push({
          periodo: diasSemana[i],
          valor: (receitaDia[0]?.total || 0) / 100
        });
      }
    } else if (periodo === 'mes') {
      // Receita pelas últimas 4 semanas
      for (let semana = 3; semana >= 0; semana--) {
        const fimSemana = new Date(hoje);
        fimSemana.setDate(hoje.getDate() - (semana * 7));
        const inicioSemana = new Date(fimSemana);
        inicioSemana.setDate(fimSemana.getDate() - 6);
        
        const inicioSemanaStr = inicioSemana.toISOString().split('T')[0];
        const fimSemanaStr = fimSemana.toISOString().split('T')[0];
        
        const receitaSemana = await all(`
          SELECT SUM(COALESCE(preco, 0)) as total 
          FROM agendamentos 
          WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
        `, [inicioSemanaStr, fimSemanaStr]);
        
        dadosReceita.push({
          periodo: `Semana ${4 - semana}`,
          valor: (receitaSemana[0]?.total || 0) / 100
        });
      }
    } else if (periodo === 'ultimos15dias') {
      // Receita dos últimos 15 dias
      for (let i = 14; i >= 0; i--) {
        const dia = new Date(hoje);
        dia.setDate(hoje.getDate() - i);
        const diaStr = dia.toISOString().split('T')[0];
        
        const receitaDia = await all(`
          SELECT SUM(COALESCE(preco, 0)) as total 
          FROM agendamentos 
          WHERE data = ? AND status = 'Confirmado'
        `, [diaStr]);
        
        dadosReceita.push({
          periodo: dia.getDate().toString().padStart(2, '0') + '/' + (dia.getMonth() + 1).toString().padStart(2, '0'),
          valor: (receitaDia[0]?.total || 0) / 100
        });
      }
    } else {
      // Para outros períodos, manter a lógica original
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

      dadosReceita = [
        { periodo: "Hoje", valor: (receitaDiaria[0]?.total || 0) / 100 },
        { periodo: "Semana", valor: (receitaSemanal[0]?.total || 0) / 100 },
        { periodo: "Mês", valor: (receitaMensal[0]?.total || 0) / 100 }
      ];
    }

    // Buscar top clientes
    const topClientes = await all(`
      SELECT 
        cliente_nome as name,
        COUNT(*) as visits,
        MAX(data) as last_visit,
        SUM(COALESCE(preco, 0)) / 100 as spent
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY cliente_nome 
      ORDER BY visits DESC, spent DESC
      LIMIT 10
    `, [dataInicioStr, dataFimStr]);

    res.json({
      by_service: servicosCompletos || [],
      receita_detalhada: dadosReceita,
      totals: {
        daily: dadosReceita.find(d => d.periodo === 'Hoje')?.valor || 0,
        weekly: dadosReceita.find(d => d.periodo === 'Semana')?.valor || 0,
        monthly: dadosReceita.reduce((acc, curr) => acc + curr.valor, 0)
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
      receitaDia: (receitaHoje[0]?.total || 0) / 100,
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
    const receitaTotal = await all(`SELECT SUM(preco) / 100 as total FROM agendamentos ${whereClause} AND status = 'Confirmado'`, params);
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
      receitaTotal: (receitaTotal[0]?.total || 0),
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
