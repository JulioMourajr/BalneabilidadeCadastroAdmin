FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD [ "npm", "run", "start", "--", "--host", "0.0.0.0" ]