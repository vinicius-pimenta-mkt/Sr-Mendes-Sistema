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

    // Lista de todos os serviços possíveis (baseado nos agendamentos existentes)
    const todosServicos = await all(`
      SELECT DISTINCT servico 
      FROM agendamentos 
      ORDER BY servico
    `);

    // Buscar serviços realizados por barbeiro no período
    const servicosPorBarbeiro = await all(`
      SELECT 
        servico as service, 
        barber,
        COUNT(*) as qty, 
        SUM(COALESCE(preco, 0)) as revenue
      FROM agendamentos 
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
      GROUP BY servico, barber
      ORDER BY service, barber
    `, [dataInicioStr, dataFimStr]);

    // Processar dados para o gráfico vertical (Lucas vs Yuri)
    const servicosCompletos = todosServicos.map(servico => {
      const dadosLucas = servicosPorBarbeiro.find(s => s.service === servico.servico && (s.barber === 'Lucas' || s.barber === 'Mendes')) || { qty: 0, revenue: 0 };
      const dadosYuri = servicosPorBarbeiro.find(s => s.service === servico.servico && (s.barber === 'Turi' || s.barber === 'Yuri')) || { qty: 0, revenue: 0 };
      
      return {
        service: servico.servico,
        lucas_qty: dadosLucas.qty,
        yuri_qty: dadosYuri.qty,
        total_qty: dadosLucas.qty + dadosYuri.qty,
        revenue: (dadosLucas.revenue + dadosYuri.revenue) / 100
      };
    }).sort((a, b) => b.total_qty - a.total_qty);

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

    // Buscar todos os agendamentos do período para a lista de serviços na aba Receita
    const agendamentosLucas = await all(`
      SELECT cliente_nome, servico, data, hora, preco, "Lucas" as barber
      FROM agendamentos
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
    `, [dataInicioStr, dataFimStr]);

    const agendamentosYuri = await all(`
      SELECT cliente_nome, servico, data, hora, preco, "Yuri" as barber
      FROM agendamentos_yuri
      WHERE data BETWEEN ? AND ? AND status = 'Confirmado'
    `, [dataInicioStr, dataFimStr]);

    const todosAgendamentos = [...agendamentosLucas, ...agendamentosYuri].sort((a, b) => {
      const dateA = new Date(`${a.data}T${a.hora}`);
      const dateB = new Date(`${b.data}T${b.hora}`);
      return dateB - dateA;
    });

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
