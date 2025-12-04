# Build stage

FROM node:20-alpine AS builder

WORKDIR /app

COPY services/frontend/package*.json ./

RUN npm install

COPY services/frontend ./services/frontend

RUN npm run build --prefix services/frontend

# Production container

FROM nginx:alpine

COPY --from=builder /app/services/frontend/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
