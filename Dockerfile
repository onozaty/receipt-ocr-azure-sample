FROM node:22-slim AS base

RUN npm install -g pnpm

FROM base AS build
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile
RUN pnpm run build
RUN CI=true pnpm prune --prod --ignore-scripts

FROM base
COPY ./package.json pnpm-lock.yaml /app/
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
WORKDIR /app
CMD ["pnpm", "run", "start"]
