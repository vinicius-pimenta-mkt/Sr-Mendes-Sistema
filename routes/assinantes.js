import express from 'express';
import { all, get, query } from '../database/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Listar todos os assinantes
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, plano } = req.query;
    let sql = 'SELECT * FROM assinantes';
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push(' status = ?');
      params.push(status);
    }
    if (plano) {
      conditions.push(' plano = ?');
      params.push(plano);
    }

    if (conditions.length > 0) {
      sql += ' WHERE' + conditions.join(' AND');
    }
    
    sql += ' ORDER BY nome ASC';
    const result = await all(sql, params);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar assinantes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar assinante por nome/CPF (para IA)
router.get('/check', async (req, res) => {
  try {
    const { nome, cpf } = req.query;
    if (!nome && !cpf) {
      return res.status(400).json({ error: 'Nome ou CPF obrigatórios' });
    }

    let sql = 'SELECT * FROM assinantes WHERE status = "Ativo" AND (nome LIKE ? OR cpf LIKE ?)';
    const result = await get(sql, [`%${nome}%`, `%${cpf}%`]);
    
    if (result) {
      res.json({ is_active: true, data: result });
    } else {
      res.json({ is_active: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao consultar assinante' });
  }
});

// Criar assinante
router.post('/', verifyToken, async (req, res) => {
  try {
    const { nome, cpf, plano, data_vencimento, ultimo_pagamento, forma_pagamento, status = 'Ativo' } = req.body;
    
    const result = await query(
      'INSERT INTO assinantes (nome, cpf, plano, data_vencimento, ultimo_pagamento, forma_pagamento, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nome, cpf, plano, data_vencimento, ultimo_pagamento, forma_pagamento, status]
    );
    
    res.status(201).json({ id: result.lastID, message: 'Assinante cadastrado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar assinante' });
  }
});

// Atualizar assinante
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cpf, plano, data_vencimento, ultima_visita, ultimo_pagamento, forma_pagamento, status } = req.body;

    await query(
      'UPDATE assinantes SET nome=?, cpf=?, plano=?, data_vencimento=?, ultima_visita=?, ultimo_pagamento=?, forma_pagamento=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [nome, cpf, plano, data_vencimento, ultima_visita, ultimo_pagamento, forma_pagamento, status, id]
    );
    
    res.json({ message: 'Assinante atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar assinante' });
  }
});

// Deletar assinante
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM assinantes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Assinante removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover assinante' });
  }
});

export default router;
