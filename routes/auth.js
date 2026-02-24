import express from 'express';
import jwt from 'jsonwebtoken';
import { get } from '../database/database.js';

const router = express.Router();

// Middleware para verificar token
export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '019283');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password são obrigatórios' });
    }

    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user || password !== user.password) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // INJEÇÃO DA MANUS: Incluindo o 'role' no Token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || '019283',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      // INJEÇÃO DA MANUS: Devolvendo o 'role' para o Frontend
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para obter dados do usuário autenticado
router.get('/me', verifyToken, async (req, res) => {
  try {
    // INJEÇÃO DA MANUS: Buscando o 'role' no banco de dados
    const user = await get('SELECT id, username, role FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Erro em /me:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
