FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ ./src/
COPY public/ ./public/

EXPOSE 3000
EXPOSE 53538/udp

CMD ["node", "src/server.js"]
