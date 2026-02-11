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

    // Consulta unificada para serviços por barbeiro
    const servicosPorBarbeiro = await all(`
      SELECT service, barber, SUM(qty) as qty, SUM(revenue) as revenue
      FROM (
        SELECT servico as service, 'Lucas' as barber, COUNT(*) as qty, SUM(COALESCE(preco, 0)) as revenue
        FROM agendamentos 
        WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
        GROUP BY servico
        UNION ALL
        SELECT servico as service, 'Yuri' as barber, COUNT(*) as qty, SUM(COALESCE(preco, 0)) as revenue
        FROM agendamentos_yuri 
        WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
        GROUP BY servico
      )
      GROUP BY service, barber
    `, [dataInicioStr, dataFimStr, dataInicioStr, dataFimStr]);

    // Lista de todos os serviços únicos encontrados em ambas as tabelas no período
    const todosServicosNomes = [...new Set(servicosPorBarbeiro.map(s => s.service))];

    // Processar dados para o gráfico vertical (Lucas vs Yuri)
    const servicosCompletos = todosServicosNomes.map(nome => {
      const dadosLucas = servicosPorBarbeiro.find(s => s.service === nome && s.barber === 'Lucas') || { qty: 0, revenue: 0 };
      const dadosYuri = servicosPorBarbeiro.find(s => s.service === nome && s.barber === 'Yuri') || { qty: 0, revenue: 0 };
      
      return {
        service: nome,
        lucas_qty: dadosLucas.qty,
        yuri_qty: dadosYuri.qty,
        total_qty: dadosLucas.qty + dadosYuri.qty,
        revenue: (dadosLucas.revenue + dadosYuri.revenue) / 100
      };
    }).sort((a, b) => b.total_qty - a.total_qty);

    // Dados de receita baseados no período (Unificado)
    let dadosReceita = [];
    
    const queryReceita = async (params, groupBy) => {
      return await all(`
        SELECT ${groupBy} as label, SUM(COALESCE(preco, 0)) as total
        FROM (
          SELECT data, hora, preco, status FROM agendamentos
          UNION ALL
          SELECT data, hora, preco, status FROM agendamentos_yuri
        )
        WHERE status = 'Confirmado' AND ${params}
        GROUP BY label
      `, []);
    };

    // Para simplificar e garantir que funcione, vamos usar uma lógica mais direta para a evolução da receita
    if (periodo === 'hoje' || (data_inicio && data_fim && dataInicioStr === dataFimStr)) {
      for (let hora = 8; hora <= 18; hora++) {
        const hStr = hora.toString().padStart(2, '0');
        const r = await all(`
          SELECT SUM(COALESCE(preco, 0)) as total FROM (
            SELECT data, hora, preco, status FROM agendamentos UNION ALL SELECT data, hora, preco, status FROM agendamentos_yuri
          ) WHERE status = 'Confirmado' AND data = ? AND hora LIKE ?`, [dataInicioStr, hStr + ':%']);
        dadosReceita.push({ periodo: `${hora}h`, valor: (r[0]?.total || 0) / 100 });
      }
    } else {
      // Default: agrupar por data para o período selecionado
      const r = await all(`
        SELECT data, SUM(COALESCE(preco, 0)) as total FROM (
          SELECT data, preco, status FROM agendamentos UNION ALL SELECT data, preco, status FROM agendamentos_yuri
        ) WHERE status = 'Confirmado' AND data BETWEEN ? AND ? GROUP BY data ORDER BY data`, [dataInicioStr, dataFimStr]);
      
      dadosReceita = r.map(item => ({
        periodo: item.data.split('-').reverse().slice(0, 2).join('/'),
        valor: item.total / 100
      }));
    }

    // Buscar todos os agendamentos do período para a lista de serviços na aba Receita
    const todosAgendamentos = await all(`
      SELECT cliente_nome, servico, data, hora, preco, barber
      FROM (
        SELECT cliente_nome, servico, data, hora, preco, 'Lucas' as barber, status FROM agendamentos
        UNION ALL
        SELECT cliente_nome, servico, data, hora, preco, 'Yuri' as barber, status FROM agendamentos_yuri
      )
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      ORDER BY data DESC, hora DESC
    `, [dataInicioStr, dataFimStr]);

    // Buscar top clientes
    const topClientes = await all(`
      SELECT 
        cliente_nome as name,
        COUNT(*) as visits,
        MAX(data) as last_visit,
        SUM(COALESCE(preco, 0)) / 100 as spent
      FROM (
        SELECT cliente_nome, data, preco, status FROM agendamentos
        UNION ALL
        SELECT cliente_nome, data, preco, status FROM agendamentos_yuri
      )
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY cliente_nome 
      ORDER BY visits DESC, spent DESC
      LIMIT 10
    `, [dataInicioStr, dataFimStr]);

    res.json({
      by_service: servicosCompletos || [],
      receita_detalhada: dadosReceita,
      agendamentos: todosAgendamentos,
      totals: {
        daily: 0, // Pode ser calculado do dadosReceita se necessário
        weekly: 0,
        monthly: 0
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

    // Buscar dados do dashboard (Lucas)
    const agendamentosHojeLucas = await all('SELECT COUNT(*) as total FROM agendamentos WHERE data = ?', [hoje]);
    const receitaHojeLucas = await all('SELECT SUM(preco) as total FROM agendamentos WHERE data = ? AND status = ?', [hoje, 'Confirmado']);
    const proximosAgendamentosLucas = await all('SELECT *, "Lucas" as barber FROM agendamentos WHERE data >= ? ORDER BY data, hora LIMIT 5', [hoje]);
    const servicosRealizadosLucas = await all('SELECT COUNT(*) as total FROM agendamentos WHERE data = ? AND status = ?', [hoje, 'Confirmado']);

    // Buscar dados do dashboard (Yuri)
    const agendamentosHojeYuri = await all('SELECT COUNT(*) as total FROM agendamentos_yuri WHERE data = ?', [hoje]);
    const receitaHojeYuri = await all('SELECT SUM(preco) as total FROM agendamentos_yuri WHERE data = ? AND status = ?', [hoje, 'Confirmado']);
    const proximosAgendamentosYuri = await all('SELECT *, "Yuri" as barber FROM agendamentos_yuri WHERE data >= ? ORDER BY data, hora LIMIT 5', [hoje]);
    const servicosRealizadosYuri = await all('SELECT COUNT(*) as total FROM agendamentos_yuri WHERE data = ? AND status = ?', [hoje, 'Confirmado']);

    const todosProximos = [...proximosAgendamentosLucas, ...proximosAgendamentosYuri]
      .sort((a, b) => {
        const dateA = new Date(`${a.data}T${a.hora}`);
        const dateB = new Date(`${b.data}T${b.hora}`);
        return dateA - dateB;
      })
      .slice(0, 10);

    res.json({
      atendimentosHoje: (agendamentosHojeLucas[0]?.total || 0) + (agendamentosHojeYuri[0]?.total || 0),
      receitaDia: ((receitaHojeLucas[0]?.total || 0) + (receitaHojeYuri[0]?.total || 0)) / 100,
      proximosAgendamentos: todosProximos.length,
      servicosRealizados: (servicosRealizadosLucas[0]?.total || 0) + (servicosRealizadosYuri[0]?.total || 0),
      agendamentos: todosProximos,
      servicos: []
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
