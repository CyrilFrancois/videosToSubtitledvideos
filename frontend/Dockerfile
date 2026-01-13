# Use Node alpine for a small footprint
FROM node:18-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
# For development, we use 'npm run dev'
# For production, you would run 'npm run build'
EXPOSE 3000
CMD ["npm", "run", "dev"]