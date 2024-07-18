FROM node:20-alpine3.20 as builder
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build

#Stage 2
FROM nginx:1.19.0
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/dist .
COPY nginx.conf /etc/nginx/nginx.conf
ENTRYPOINT ["nginx", "-g", "daemon off;"]

