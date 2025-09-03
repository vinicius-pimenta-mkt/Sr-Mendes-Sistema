# Sistema de Gerenciamento Sr. Mendes Barbearia - Node.js

## Visão Geral

Este é um sistema completo de gerenciamento para a Sr. Mendes Barbearia, convertido de Python/Flask para Node.js/Express. O sistema permite que os clientes façam agendamentos através do WhatsApp (via N8N) e que o barbeiro gerencie todos os aspectos do negócio através de um dashboard web.

## Tecnologias Utilizadas

- **Backend**: Node.js + Express
- **Banco de Dados**: SQLite
- **Autenticação**: JWT (JSON Web Tokens)
- **Frontend**: HTML/CSS/JavaScript (SPA)
- **Deploy**: Vercel

## Funcionalidades

### 🔐 Sistema de Autenticação
- Login seguro para o proprietário da barbearia
- Proteção de rotas com JWT
- Interface de login personalizada com a marca da barbearia

### 📊 Dashboard Administrativo
- Visão geral dos atendimentos do dia
- Receita diária e mensal
- Próximos agendamentos
- Relatórios de serviços realizados

### 👥 Gestão de Clientes
- Cadastro e edição de clientes
- Histórico de atendimentos
- Informações de contato

### 📅 Gestão de Agendamentos
- Visualização de agendamentos por data
- Criação, edição e cancelamento de agendamentos
- Status dos agendamentos (Confirmado, Pendente, Cancelado)

### 🤖 Integração com N8N
- Webhook para receber dados do WhatsApp
- API endpoints para criar/atualizar agendamentos
- Sincronização automática com o sistema

## Estrutura do Projeto

```
barbearia-mendes-nodejs/
├── server.js                # Servidor principal Express
├── package.json             # Dependências e scripts
├── vercel.json             # Configuração para deploy na Vercel
├── .env                    # Variáveis de ambiente
├── database/
│   ├── init.js             # Inicialização do banco SQLite
│   └── barbearia.db        # Banco de dados SQLite
├── routes/
│   ├── auth.js             # Rotas de autenticação
│   ├── clientes.js         # Rotas de clientes
│   ├── agendamentos.js     # Rotas de agendamentos
│   └── relatorios.js       # Rotas de relatórios
├── public/                 # Frontend estático
│   ├── index.html
│   ├── assets/
│   └── ...
└── README.md               # Esta documentação
```

## Instalação e Execução Local

### Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn

### Passos

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd barbearia-mendes-nodejs
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com suas configurações
   ```

4. **Execute o servidor:**
   ```bash
   npm start
   ```

5. **Acesse o sistema:**
   - URL: http://localhost:3000
   - Usuário: adminmendes
   - Senha: mendesbarber01

## Deploy na Vercel

### Método 1: Via CLI

1. **Instale a Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Faça login na Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy o projeto:**
   ```bash
   vercel
   ```

4. **Configure as variáveis de ambiente:**
   - Acesse o dashboard da Vercel
   - Vá em Settings > Environment Variables
   - Adicione as variáveis do arquivo .env

### Método 2: Via GitHub

1. **Conecte seu repositório ao GitHub**
2. **Importe o projeto na Vercel**
3. **Configure as variáveis de ambiente**
4. **Deploy automático**

## Variáveis de Ambiente

```env
PORT=3000
ADMIN_USER=adminmendes
ADMIN_PASS=mendesbarber01
JWT_SECRET=019283
N8N_API_KEY=019283
```

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login do administrador

### Clientes
- `GET /api/clientes` - Listar todos os clientes
- `POST /api/clientes` - Criar novo cliente
- `PUT /api/clientes/:id` - Atualizar cliente
- `DELETE /api/clientes/:id` - Remover cliente

### Agendamentos
- `GET /api/agendamentos` - Listar todos os agendamentos
- `POST /api/agendamentos` - Criar novo agendamento
- `PUT /api/agendamentos/:id` - Atualizar agendamento
- `DELETE /api/agendamentos/:id` - Cancelar agendamento
- `GET /api/agendamentos/hoje` - Agendamentos do dia

### Relatórios
- `GET /api/relatorios/dashboard` - Dados do dashboard
- `GET /api/relatorios/mensal` - Relatório mensal
- `POST /api/relatorios/n8n` - Webhook para N8N

## Integração com N8N

### Configuração do Webhook

1. **No N8N, configure um webhook HTTP:**
   - URL: `https://seu-dominio.vercel.app/api/relatorios/n8n`
   - Método: POST
   - Headers: `Content-Type: application/json`

2. **Estrutura dos dados para envio:**
   ```json
   {
     "tipo": "novo_agendamento",
     "cliente": "Nome do Cliente",
     "telefone": "(11) 99999-9999",
     "servico": "Corte e Barba",
     "data": "2025-09-03",
     "hora": "14:30"
   }
   ```

## Melhorias Implementadas

### Conversão Python → Node.js
- ✅ Migração completa do backend Flask para Express
- ✅ Substituição do PostgreSQL/Supabase por SQLite
- ✅ Manutenção de todas as funcionalidades originais
- ✅ Compatibilidade total com deploy na Vercel
- ✅ Melhor performance e menor uso de recursos

### Vantagens da Nova Versão
- **Deploy Simplificado**: Sem dependências externas complexas
- **Banco Local**: SQLite elimina problemas de conexão
- **Melhor Compatibilidade**: Node.js é nativamente suportado pela Vercel
- **Menor Latência**: Menos overhead de dependências
- **Manutenção Facilitada**: Código mais limpo e organizado

## Credenciais de Acesso

- **Usuário:** adminmendes
- **Senha:** mendesbarber01

## Suporte e Manutenção

Para dúvidas ou problemas:
1. Verifique os logs na Vercel
2. Confirme se as variáveis de ambiente estão configuradas
3. Teste os endpoints da API individualmente
4. Verifique se o banco de dados foi inicializado corretamente

## Scripts Disponíveis

- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em modo desenvolvimento (com watch)

---

**Desenvolvido por:** Manus AI  
**Data:** Setembro 2025  
**Versão:** 2.0.0 (Node.js)  
**Versão Original:** 1.0.0 (Python/Flask)

