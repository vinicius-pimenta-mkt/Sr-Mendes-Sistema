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
    // Se a IA mandou como número puro (ex: 45). Multiplica pra virar centavos (4500).
    return precoRaw < 1000 ? Math.round(precoRaw * 100) : Math.round(precoRaw);
  }

  // Limpa tudo que não for número, ponto ou vírgula
  let limpo = String(precoRaw).replace(/[^\d.,]/g, '');
  if (!limpo) return 0;

  // Se tiver vírgula (padrão Brasil), converte pra ponto (padrão Computador)
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  }

  const valorFloat = parseFloat(limpo);
  if (isNaN(valorFloat)) return 0;

  // Transforma em centavos
  return valorFloat < 1000 ? Math.round(valorFloat * 100) : Math.round(valorFloat);
};

const padronizarPagamento = (forma) => {
  if (!forma) return 'Não informado';
  const limpo = String(forma).toLowerCase().trim().replace(/\./g, '');
  
  if (limpo.includes('crédito') || limpo.includes('credito')) return 'Cartão de Crédito';
  if (limpo.includes('débito') || limpo.includes('debito')) return 'Cartão de Débito';
  if (limpo.includes('dinheiro')) return 'Dinheiro';
  if (limpo.includes('pix')) return 'Pix';
  
  // Se for algo diferente, só garante que está formatado bonitinho
  return String(forma).trim();
};

const padronizarServico = (servico) => {
  if (!servico) return 'Não informado';
  return String(servico).trim().replace(/\s+/g, ' '); // Tira espaços duplos
};
// --- FIM DOS FILTROS BLINDADOS ---

// Trava Global de Dias Fechados
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

// Listar todos os agendamentos
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, data_inicio, data_fim, status } = req.query;
    let queryText = 'SELECT * FROM agendamentos';
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
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// NOVA ROTA PARA A IA: Calcula a disponibilidade exata
router.get('/disponibilidade', verifyToken, async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) return res.status(400).json({ error: 'Data é obrigatória' });

    if (isDiaFechado(data)) {
      return res.json({ livres: [], mensagem: 'A barbearia está fechada aos Domingos e Segundas.' });
    }

    const [ano, mes, dia] = data.split('-');
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
    
    if (data === hojeStr) {
       const horaAtual = dataBrasilia.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });
       slots = slots.filter(slot => slot > horaAtual.substring(0, 5));
    } else if (data < hojeStr) {
       return res.json({ livres: [], mensagem: 'Não é possível agendar no passado.' });
    }

    const ocupados = await all(
      "SELECT hora FROM agendamentos WHERE data = ? AND status IN ('Confirmado', 'Pendente', 'Bloqueado')",
      [data]
    );
    const horasOcupadas = ocupados.map(o => o.hora.substring(0, 5));

    const horariosLivres = slots.filter(slot => !horasOcupadas.includes(slot));

    res.json({ livres: horariosLivres });
  } catch (error) {
    console.error('Erro na disponibilidade:', error);
    res.status(500).json({ error: 'Erro ao calcular disponibilidade' });
  }
});

// Criar novo agendamento
router.post('/', async (req, res) => {
  try {
    const { cliente_nome, cliente_telefone, servico, data, hora, status = 'Confirmado', preco, forma_pagamento, observacoes, cliente_id } = req.body;

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
      "SELECT id FROM agendamentos WHERE data = ? AND hora = ? AND status != 'Cancelado'",
      [data, horaFormatada]
    );

    if (horarioOcupado && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'Horário indisponível. Já existe um agendamento para este momento.' });
    }

    const safeClienteId = cliente_id || null;

    const result = await query(
      'INSERT INTO agendamentos (cliente_id, cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
    
    res.status(201).json({ id: result.lastID, message: 'Agendamento criado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// Atualizar agendamento
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
      "SELECT id FROM agendamentos WHERE data = ? AND hora = ? AND status != 'Cancelado' AND id != ?",
      [data, hora, id]
    );

    if (horarioOcupado && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'Horário indisponível. Já existe um agendamento para este momento.' });
    }

    await query(
      'UPDATE agendamentos SET cliente_nome=?, cliente_telefone=?, servico=?, data=?, hora=?, status=?, preco=?, forma_pagamento=?, observacoes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
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
    
    res.json({ message: 'Agendamento atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM agendamentos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Agendamento deletado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
  }
});

export default router;
