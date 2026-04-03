FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json

RUN npm install

COPY apps/web apps/web
COPY packages/config packages/config

WORKDIR /app/apps/web
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/package.json package.json
COPY --from=build /app/package-lock.json package-lock.json
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/web apps/web
COPY --from=build /app/packages/config packages/config

WORKDIR /app/apps/web
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
