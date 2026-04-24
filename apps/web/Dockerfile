FROM node:25.9.0-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev", "--host"]   # --host exposes on 0.0.0.0 inside container