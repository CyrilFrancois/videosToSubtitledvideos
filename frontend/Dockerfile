FROM node:18-alpine

WORKDIR /app

# 1. Copy package files first
COPY package*.json ./

# 2. Force install including devDependencies
RUN npm install

# 3. Copy configuration files specifically
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY tsconfig.json ./

# 4. Copy the rest of the source code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]