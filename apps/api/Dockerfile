FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json

RUN npm install

COPY apps/api apps/api
COPY packages/config packages/config
COPY packages/contracts/deployments packages/contracts/deployments

WORKDIR /app/apps/api
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/package.json package.json
COPY --from=build /app/package-lock.json package-lock.json
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api apps/api
COPY --from=build /app/packages/config packages/config
COPY --from=build /app/packages/contracts/deployments packages/contracts/deployments

WORKDIR /app/apps/api
CMD ["npm", "run", "start"]
