FROM node:20-slim

WORKDIR /app

# Copiar package.json primeiro
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copiar todo o código
COPY . .

RUN npm run build

# Instalar servidor
RUN npm install -g serve

EXPOSE 5000

CMD ["serve", "-s", "dist", "-l", "5000"]