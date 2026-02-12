import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importar rotas
import authRoutes from './routes/auth.js';
import clientesRoutes from './routes/clientes.js';
import agendamentosRoutes from './routes/agendamentos.js';
import agendamentosYuriRoutes from './routes/agendamentos-yuri.js';
import relatoriosRoutes from './routes/relatorios.js';

// Importar inicialização do banco
import { initDatabase } from './database/database.js';

// Carregar variáveis de ambiente
dotenv.config();

console.log('--- Iniciando Servidor Barbearia ---');
console.log('Ambiente:', process.env.NODE_ENV);
console.log('Porta:', process.env.PORT || 3001);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: '*', 
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota de teste
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Barbearia Mendes funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/agendamentos-yuri', agendamentosYuriRoutes);
app.use('/api/relatorios', relatoriosRoutes);

// Rota 404 para APIs não encontradas
app.use('*', (req, res) => {
  console.log(`404 - Rota não encontrada: ${req.originalUrl}`);
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Inicializar banco de dados e servidor
const startServer = async () => {
  try {
    console.log('Inicializando banco de dados...');
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API rodando na porta ${PORT}`);
      console.log('Servidor pronto para receber requisições.');
    });
  } catch (error) {
    console.error('ERRO CRÍTICO ao inicializar servidor:', error);
    process.exit(1);
  }
};

// Lógica de inicialização para Easypanel/Docker vs Vercel
if (process.env.VERCEL || process.env.NOW_REGION) {
  console.log('Detectado ambiente Vercel/Serverless');
  initDatabase().catch(err => console.error('Erro Vercel Init:', err));
} else {
  console.log('Detectado ambiente de Servidor (Easypanel/Docker/Local)');
  startServer();
}

export default app;
