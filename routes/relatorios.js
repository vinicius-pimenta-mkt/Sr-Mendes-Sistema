import express from 'express';
import { all } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

router.get('/dashboard', verifyToken, async (req, res) => {
  try {

    const agora = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(agora);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));

    const hoje = `${map.year}-${map.month}-${map.day}`;
    const agoraHora = `${map.hour}:${map.minute}`;

    const horaParaMinutos = (hora) => {
      const [h, m] = hora.split(':').map(Number);
      return h * 60 + m;
    };

    const agoraMin = horaParaMinutos(agoraHora);
    const aberturaMin = horaParaMinutos("09:00");

    /* ======================================================
       BASE ÚNICA DO DIA (MESMA DA TABELA)
    ====================================================== */
    const agendamentosHoje = await all(`
      SELECT * FROM (
        SELECT id, cliente_nome, servico, data, hora, status, preco, 'Lucas' as barber
        FROM agendamentos
        WHERE data = ? AND status != 'Cancelado'
        UNION ALL
        SELECT id, cliente_nome, servico, data, hora, status, preco, 'Yuri' as barber
        FROM agendamentos_yuri
        WHERE data = ? AND status != 'Cancelado'
      )
      ORDER BY hora ASC
    `, [hoje, hoje]);

    /* ======================================================
       TABELA (APENAS FUTUROS)
    ====================================================== */
    const agendamentosFuturos = agendamentosHoje.filter(a =>
      horaParaMinutos(a.hora) >= agoraMin
    );

    /* ======================================================
       PENDENTES (MESMA BASE)
    ====================================================== */
    const pendentesHoje = agendamentosHoje.filter(a =>
      a.status === 'Pendente'
    ).length;

    /* ======================================================
       REALIZADOS
    ====================================================== */
    let realizadosHoje = 0;

    if (agoraMin >= aberturaMin) {
      realizadosHoje = agendamentosHoje.filter(a => {
        const horaMin = horaParaMinutos(a.hora);
        return (
          (a.status === 'Confirmado' || a.status === 'Pendente') &&
          horaMin <= agoraMin
        );
      }).length;
    }

    /* ======================================================
       RECEITA DO DIA
       Confirmado + Pendente
       que já passaram do horário
    ====================================================== */
    const receitaHoje = agendamentosHoje
      .filter(a => {
        const horaMin = horaParaMinutos(a.hora);
        return (
          (a.status === 'Confirmado' || a.status === 'Pendente') &&
          horaMin <= agoraMin
        );
      })
      .reduce((total, a) => total + (a.preco || 0), 0);

    res.json({
      atendimentosHoje: agendamentosHoje.length,
      receitaDia: receitaHoje / 100,
      servicosRealizados: realizadosHoje,
      servicosAguardando: pendentesHoje,
      agendamentos: agendamentosFuturos,
      agoraHora,
      hoje
    });

  } catch (error) {
    console.error('Erro em /dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
