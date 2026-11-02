FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p uploads/avatars && chown -R node:node /app
USER node
EXPOSE 5000
# Run migrations, then start the API.
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node src/server.js"]
