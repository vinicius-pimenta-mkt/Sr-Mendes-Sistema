import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

const limparTelefone = (telefone) => {
  if (!telefone || typeof telefone !== 'string') return null;
  const apenasNumeros = telefone.replace(/\D/g, '');
  return apenasNumeros.length > 0 ? apenasNumeros : null;
};

// Trava Global de Dias Fechados (REFORÇADA - À Prova de IA)
const isDiaFechado = (dataStr) => {
  if (!dataStr) return false;
  try {
    // Limpa a data caso a IA envie com fuso horário ou horas junto
    const soData = dataStr.split('T')[0].split(' ')[0];
    let ano, mes, dia;
    
    // Entende tanto formato DD/MM/YYYY quanto YYYY-MM-DD
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

    // 1. Verifica Domingo e Segunda
    if (isDiaFechado(data)) {
      return res.json({ livres: [], mensagem: 'A barbearia está fechada aos Domingos e Segundas.' });
    }

    const [ano, mes, dia] = data.split('-');
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = dataObj.getDay();

    // 2. Gera a grade de horários (a matemática do funcionamento)
    let slots = [];
    if (diaSemana === 6) { 
      // Sábado: 08:00 às 18:00 (Com almoço 12h)
      for (let h = 8; h < 18; h++) {
        if (h !== 12) { // <- TRAVA DO ALMOÇO ADICIONADA NO SÁBADO
          slots.push(`${h.toString().padStart(2, '0')}:00`);
          slots.push(`${h.toString().padStart(2, '0')}:30`);
        }
      }
    } else { 
      // Terça a Sexta: 09:00 às 19:00 (Com almoço 12h)
      for (let h = 9; h < 19; h++) {
        if (h !== 12) { 
          slots.push(`${h.toString().padStart(2, '0')}:00`);
          slots.push(`${h.toString().padStart(2, '0')}:30`);
        }
      }
    }

    // 3. Remove horários que já passaram (se for hoje)
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

    // 4. Busca os horários ocupados no banco de dados
    const ocupados = await all(
      "SELECT hora FROM agendamentos WHERE data = ? AND status IN ('Confirmado', 'Pendente', 'Bloqueado')",
      [data]
    );
    const horasOcupadas = ocupados.map(o => o.hora.substring(0, 5));

    // 5. Cruza os dados: O que tem na grade que NÃO está ocupado?
    const horariosLivres = slots.filter(slot => !horasOcupadas.includes(slot));

    res.json({ livres: horariosLivres });
  } catch (error) {
    console.error('Erro na disponibilidade:', error);
    res.status(500).json({ error: 'Erro ao calcular disponibilidade' });
  }
});

// Criar novo agendamento (API protegida)
// Criar novo agendamento (API protegida)
router.post('/', async (req, res) => {
  try {
    const { cliente_nome, cliente_telefone, servico, data, hora, status = 'Confirmado', preco, forma_pagamento, observacoes, cliente_id } = req.body;

    if (!cliente_nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    // NORMALIZAÇÃO: Corta os segundos para garantir que fique sempre no formato "HH:mm" (ex: "09:30")
    const horaFormatada = hora.substring(0, 5);

    // TRAVA 1: Rejeita dias fechados
    if (isDiaFechado(data) && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'A barbearia está fechada aos Domingos e Segundas-feiras.' });
    }

    // TRAVA 2: ANTI-CHOQUE DE AGENDA (Agora com a hora formatada)
    const horarioOcupado = await get(
      "SELECT id FROM agendamentos WHERE data = ? AND hora = ? AND status != 'Cancelado'",
      [data, horaFormatada]
    );

    if (horarioOcupado && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'Horário indisponível. Já existe um agendamento para este momento.' });
    }

    const telefoneLimpo = limparTelefone(cliente_telefone);
    const safeClienteId = cliente_id || null;

    // Salvando no banco com a horaFormatada
    const result = await query(
      'INSERT INTO agendamentos (cliente_id, cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [safeClienteId, cliente_nome, telefoneLimpo, servico, data, horaFormatada, status, preco, forma_pagamento, observacoes]
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

// Atualizar agendamento (API protegida)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_nome, cliente_telefone, servico, data, hora, status, preco, forma_pagamento, observacoes } = req.body;
    
    // TRAVA 1: Rejeita edição para dias fechados
    if (isDiaFechado(data) && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'A barbearia está fechada aos Domingos e Segundas-feiras.' });
    }

    // TRAVA 2: ANTI-CHOQUE DE AGENDA NA EDIÇÃO
    const horarioOcupado = await get(
      "SELECT id FROM agendamentos WHERE data = ? AND hora = ? AND status != 'Cancelado' AND id != ?",
      [data, hora, id]
    );

    if (horarioOcupado && status !== 'Bloqueado') {
      return res.status(400).json({ error: 'Horário indisponível. Já existe um agendamento para este momento.' });
    }

    const telefoneLimpo = limparTelefone(cliente_telefone);

    await query(
      'UPDATE agendamentos SET cliente_nome=?, cliente_telefone=?, servico=?, data=?, hora=?, status=?, preco=?, forma_pagamento=?, observacoes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [cliente_nome, telefoneLimpo, servico, data, hora, status, preco, forma_pagamento, observacoes, id]
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
