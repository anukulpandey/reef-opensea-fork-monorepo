FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json

RUN npm install

COPY apps/api apps/api
COPY packages/config packages/config
COPY packages/contracts/deployments packages/contracts/deployments
COPY packages/contracts/out packages/contracts/out
COPY tools/revive-deployer/target/debug/revive-deployer tools/revive-deployer/target/debug/revive-deployer

WORKDIR /app/apps/api
RUN npm run build

FROM node:22-bookworm-slim

WORKDIR /app
ENV RUNNING_IN_DOCKER=true

COPY --from=build /app/package.json package.json
COPY --from=build /app/package-lock.json package-lock.json
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api apps/api
COPY --from=build /app/packages/config packages/config
COPY --from=build /app/packages/contracts/deployments packages/contracts/deployments
COPY --from=build /app/packages/contracts/out packages/contracts/out
COPY --from=build /app/tools/revive-deployer/target/debug/revive-deployer tools/revive-deployer/target/debug/revive-deployer

WORKDIR /app/apps/api
CMD ["npm", "run", "start"]
