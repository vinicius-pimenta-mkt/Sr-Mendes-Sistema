import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// --- INÍCIO DOS FILTROS BLINDADOS (TRADUTORES DA IA) ---
const limparTelefone = (telefone) => {
  if (!telefone || typeof telefone !== 'string') return null;
  const apenasNumeros = telefone.replace(/\D/g, '');
  return apenasNumeros.length > 0 ? apenasNumeros : null;
};

const padronizarPreco = (precoRaw) => {
  if (precoRaw === null || precoRaw === undefined || precoRaw === '') return 0;
  if (typeof precoRaw === 'number') {
    return precoRaw < 1000 ? Math.round(precoRaw * 100) : Math.round(precoRaw);
  }
  let limpo = String(precoRaw).replace(/[^\d.,]/g, '');
  if (!limpo) return 0;
  if (limpo.includes(',')) { limpo = limpo.replace(/\./g, '').replace(',', '.'); }
  const valorFloat = parseFloat(limpo);
  if (isNaN(valorFloat)) return 0;
  return valorFloat < 1000 ? Math.round(valorFloat * 100) : Math.round(valorFloat);
};

const padronizarPagamento = (forma) => {
  if (!forma) return 'Não informado';
  const limpo = String(forma).toLowerCase().trim().replace(/\./g, '');
  if (limpo.includes('crédito') || limpo.includes('credito')) return 'Cartão de Crédito';
  if (limpo.includes('débito') || limpo.includes('debito')) return 'Cartão de Débito';
  if (limpo.includes('dinheiro')) return 'Dinheiro';
  if (limpo.includes('pix')) return 'Pix';
  return String(forma).trim();
};

const padronizarServico = (servico) => {
  if (!servico) return 'Não informado';
  return String(servico).trim().replace(/\s+/g, ' '); 
};
// --- FIM DOS FILTROS BLINDADOS ---

const isDiaFechado = (dataStr) => {
  if (!dataStr) return false;
  try {
    const soData = dataStr.split('T')[0].split(' ')[0];
    let ano, mes, dia;
    if (soData.includes('/')) {
      [dia, mes, ano] = soData.split('/');
    } else {
      [ano, mes, dia] = soData.split('-');
    }
    const dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia));
    const diaSemana = dataObj.getDay();
    return diaSemana === 0 || diaSemana === 1; // 0 = Domingo, 1 = Segunda
  } catch (e) {
    return false;
  }
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, data_inicio, data_fim, status } = req.query;
    let queryText = 'SELECT * FROM agendamentos_yuri';
    const params = [];
    const conditions = [];

    if (data) { conditions.push(' data = ?'); params.push(data); }
    if (data_inicio && data_fim) { conditions.push(' data BETWEEN ? AND ?'); params.push(data_inicio, data_fim);
    } else if (data_inicio) { conditions.push(' data >= ?'); params.push(data_inicio);
    } else if (data_fim) { conditions.push(' data <= ?'); params.push(data_fim); }
    if (status) { conditions.push(' status = ?'); params.push(status); }
    
    if (conditions.length > 0) { queryText += ' WHERE' + conditions.join(' AND'); }
    queryText += ' ORDER BY data DESC, hora DESC';

    const result = await all(queryText, params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos do Yuri' });
  }
});

router.get('/disponibilidade', verifyToken, async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) return res.status(400).json({ error: 'Data é obrigatória' });

    if (isDiaFechado(data)) {
      return res.json({ livres: [], mensagem: 'A barbearia está fechada aos Domingos e Segundas.' });
    }

    let dataBanco = data;
    if (data.includes('/')) {
      const [dia, mes, ano] = data.split('/');
      dataBanco = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    } else if (data.includes('-')) {
      const partes = data.split('-');
      if (partes[0].length === 4) {
        dataBanco = `${partes[0]}-${partes[1].padStart(2, '0')}-${partes[2].padStart(2, '0')}`;
      }
    }

    const [ano, mes, dia] = dataBanco.split('-');
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = dataObj.getDay();

    let slots = [];
    if (diaSemana === 6) { 
      for (let h = 8; h < 18; h++) {
        if (h !== 12) { 
          slots.push(`${h.toString().padStart(2, '0')}:00`);
          slots.push(`${h.toString().padStart(2, '0')}:30`);
        }
      }
    } else { 
      for (let h = 9; h < 19; h++) {
        if (h !== 12) { 
          slots.push(`${h.toString().padStart(2, '0')}:00`);
          slots.push(`${h.toString().padStart(2, '0')}:30`);
        }
      }
    }

    const agora = new Date();
    const brasiliaOffset = -3;
    const utc = agora.getTime() + (agora.getTimezoneOffset() * 60000);
    const dataBrasilia = new Date(utc + (3600000 * brasiliaOffset));
    const hojeStr = dataBrasilia.toISOString().split('T')[0];
    
    if (dataBanco === hojeStr) {
       const horaAtual = dataBrasilia.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });
       slots = slots.filter(slot => slot > horaAtual.substring(0, 5));
    } else if (dataBanco < hojeStr) {
       return res.json({ livres: [], mensagem: 'Não é possível agendar no passado.' });
    }

    const ocupados = await all(
      "SELECT hora FROM agendamentos_yuri WHERE data = ? AND status != 'Cancelado'",
      [dataBanco]
    );

    const horasOcupadas = ocupados.map(o => {
      if (!o.hora) return '';
      const partes = o.hora.split(':');
      return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`;
    });

    const horariosLivres = slots.filter(slot => !horasOcupadas.includes(slot));

    res.json({ livres: horariosLivres });
  } catch (error) {
    console.error('Erro na disponibilidade do Yuri:', error);
    res.status(500).json({ error: 'Erro ao calcular disponibilidade' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { cliente_nome, cliente_telefone, servico, data, hora, status = 'Pendente', preco, forma_pagamento, observacoes, cliente_id } = req.body;

    if (!cliente_nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    // APLICANDO OS FILTROS BLINDADOS ANTES DE SALVAR
    const precoLimpo = padronizarPreco(preco);
    const pagamentoLimpo = padronizarPagamento(forma_pagamento);
    const servicoLimpo = padronizarServico(servico);
    const telefoneLimpo = limparTelefone(cliente_telefone);
    const horaFormatada = hora.substring(0, 5);

    if (isDiaFechado(data) && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'A barbearia está fechada aos Domingos e Segundas-feiras.' });
    }

    const horarioOcupado = await get(
      "SELECT id FROM agendamentos_yuri WHERE data = ? AND hora = ? AND status != 'Cancelado'",
      [data, horaFormatada]
    );

    if (horarioOcupado && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'Horário indisponível. O Yuri já tem um cliente neste horário.' });
    }

    const safeClienteId = cliente_id || null;

    const result = await query(
      'INSERT INTO agendamentos_yuri (cliente_id, cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [safeClienteId, cliente_nome, telefoneLimpo, servicoLimpo, data, horaFormatada, status, precoLimpo, pagamentoLimpo, observacoes]
    );

    if (status === 'Confirmado') {
      try {
        const dataVisita = `${data.split('-').reverse().join('/')} ${horaFormatada}`;
        if (telefoneLimpo) {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE telefone = ? OR nome = ?', [dataVisita, telefoneLimpo, cliente_nome]);
        } else {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE nome = ?', [dataVisita, cliente_nome]);
        }
      } catch (e) {}
    }
    
    res.status(201).json({ id: result.lastID, message: 'Agendamento criado para o Yuri' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar agendamento do Yuri' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes } = req.body;

    // APLICANDO OS FILTROS BLINDADOS ANTES DE SALVAR
    const precoLimpo = padronizarPreco(preco);
    const pagamentoLimpo = padronizarPagamento(forma_pagamento);
    const servicoLimpo = padronizarServico(servico);
    const telefoneLimpo = limparTelefone(cliente_telefone);

    if (isDiaFechado(data) && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'A barbearia está fechada aos Domingos e Segundas-feiras.' });
    }

    const horarioOcupado = await get(
      "SELECT id FROM agendamentos_yuri WHERE data = ? AND hora = ? AND status != 'Cancelado' AND id != ?",
      [data, hora, id]
    );

    if (horarioOcupado && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'Horário indisponível. O Yuri já tem um cliente neste horário.' });
    }

    await query(
      'UPDATE agendamentos_yuri SET cliente_nome=?, cliente_telefone=?, servico=?, data=?, hora=?, status=?, preco=?, forma_pagamento=?, observacoes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [cliente_nome, telefoneLimpo, servicoLimpo, data, hora, status, precoLimpo, pagamentoLimpo, observacoes, id]
    );

    if (status === 'Confirmado') {
      try {
        const dataVisita = `${data.split('-').reverse().join('/')} ${hora}`;
        if (telefoneLimpo) {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE telefone = ? OR nome = ?', [dataVisita, telefoneLimpo, cliente_nome]);
        } else {
          await query('UPDATE assinantes SET ultima_visita = ? WHERE nome = ?', [dataVisita, cliente_nome]);
        }
      } catch (e) {}
    }
    
    res.json({ message: 'Agendamento do Yuri atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento do Yuri' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM agendamentos_yuri WHERE id = ?', [req.params.id]);
    res.json({ message: 'Agendamento do Yuri deletado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar agendamento do Yuri' });
  }
});

export default router;
