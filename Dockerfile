# Imagem única: compila o front e sobe a API central que serve o app + endpoints.
FROM node:20-slim

WORKDIR /app

# Dependências (cache de camada)
COPY package.json ./
RUN npm install --no-audit --no-fund

# Código
COPY . .

# Compila o front. Passe INTIMACOES_API_URL=same-origin no build para o app
# falar com a própria API. Segredos NÃO vão no build do front (ficam no runtime).
ARG INTIMACOES_API_URL=same-origin
ENV INTIMACOES_API_URL=$INTIMACOES_API_URL
RUN npm run build

# Runtime: a API serve dist/ e os endpoints na mesma porta.
ENV PORT=8787
EXPOSE 8787
CMD ["npm", "start"]
