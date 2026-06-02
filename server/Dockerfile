FROM node:18-alpine

WORKDIR /app

# 先装依赖以利用缓存
COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/index.js"]
