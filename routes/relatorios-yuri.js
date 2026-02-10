import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Endpoint resumo - dados para a página de relatórios do Yuri
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
      FROM agendamentos_yuri 
      ORDER BY servico
    `);

    // Buscar serviços mais vendidos no período
    const servicosVendidos = await all(`
      SELECT 
        servico as service, 
        COUNT(*) as qty, 
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos_yuri 
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
          FROM agendamentos_yuri 
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
          FROM agendamentos_yuri 
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
          FROM agendamentos_yuri 
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
          FROM agendamentos_yuri 
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
        FROM agendamentos_yuri 
        WHERE data = ? AND status = 'Confirmado'
      `, [hoje.toISOString().split('T')[0]]);

      const receitaSemanal = await all(`
        SELECT SUM(COALESCE(preco, 0)) as total 
        FROM agendamentos_yuri 
        WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      `, [new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dataFimStr]);

      const receitaMensal = await all(`
        SELECT SUM(COALESCE(preco, 0)) as total 
        FROM agendamentos_yuri 
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
      FROM agendamentos_yuri 
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
    console.error('Erro ao buscar resumo de relatórios do Yuri:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard - dados gerais do Yuri
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];

    // Buscar dados do dashboard
    const agendamentosHoje = await all('SELECT COUNT(*) as total FROM agendamentos_yuri WHERE data = ?', [hoje]);
    const receitaHoje = await all('SELECT SUM(preco) as total FROM agendamentos_yuri WHERE data = ? AND status = ?', [hoje, 'Confirmado']);
    const proximosAgendamentos = await all('SELECT * FROM agendamentos_yuri WHERE data >= ? ORDER BY data, hora LIMIT 5', [hoje]);
    const servicosRealizados = await all('SELECT COUNT(*) as total FROM agendamentos_yuri WHERE data = ? AND status = ?', [hoje, 'Confirmado']);

    res.json({
      atendimentosHoje: agendamentosHoje[0]?.total || 0,
      receitaDia: (receitaHoje[0]?.total || 0) / 100,
      proximosAgendamentos: proximosAgendamentos.length,
      servicosRealizados: servicosRealizados[0]?.total || 0,
      agendamentos: proximosAgendamentos,
      servicos: []
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard do Yuri:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
