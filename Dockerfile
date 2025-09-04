# 1. Comece com uma imagem oficial do Node.js
FROM node:18-alpine

# 2. Defina o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# 3. Copie os arquivos de definição de dependências
COPY package*.json ./

# 4. Instale as dependências da aplicação
RUN npm install

# 5. Copie o resto do código da sua aplicação para dentro do contêiner
COPY . .

# 6. Exponha a porta que sua aplicação usa (3001, como definimos)
EXPOSE 3001

# 7. O comando para iniciar sua aplicação quando o contêiner rodar
CMD [ "node", "server.js" ]
