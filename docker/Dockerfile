# Build the static site, then serve it with nginx.
# The Pea engines are prebuilt WebAssembly files in public/engines/pea/, so no
# Rust toolchain is needed here. They run in the visitor's browser.
FROM node:22-slim AS build-step

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY ./ /app/
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM nginx:stable-alpine

COPY --from=build-step /app/out /usr/share/nginx/html
COPY ./docker/nginx.default.conf /etc/nginx/conf.d/default.conf
