# syntax=docker/dockerfile:1.7

FROM node:20-bookworm AS base
ENV NODE_ENV=development
WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

FROM base AS development
COPY . .
RUN chown -R node:node /app
USER node

ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
