import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importar rotas
import authRoutes from './routes/auth.js';
import clientesRoutes from './routes/clientes.js';
import agendamentosRoutes from './routes/agendamentos.js';
import agendamentosYuriRoutes from './routes/agendamentos-yuri.js';
import relatoriosRoutes from './routes/relatorios.js';
import relatoriosYuriRoutes from './routes/relatorios-yuri.js';

// Importar inicialização do banco
import { initDatabase } from './database/database.js';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: '*', // Permitir todas as origens para desenvolvimento
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
app.use('/api/relatorios-yuri', relatoriosYuriRoutes);

// Rota 404 para APIs não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Inicializar banco de dados e servidor
const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao inicializar servidor:', error);
    process.exit(1);
  }
};

// Lógica de inicialização corrigida para Easypanel/Docker vs Vercel
if (process.env.VERCEL) {
  // Em ambiente serverless (Vercel), apenas inicializamos o banco
  initDatabase().catch(console.error);
} else {
  // Em ambientes de servidor (Docker, Easypanel, Local), iniciamos o servidor express
  startServer();
}

export default app;
