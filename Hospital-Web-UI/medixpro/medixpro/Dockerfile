# Build Next.js once, then run only the production server in the final image.
# BACKEND_PROXY_TARGET is intentionally a build argument: Next.js writes rewrites
# into its build output. Use the UAT/prod backend's private or public HTTPS URL.
FROM node:20-alpine AS dependencies

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG BACKEND_PROXY_TARGET
ENV BACKEND_PROXY_TARGET=${BACKEND_PROXY_TARGET}
ENV NEXT_TELEMETRY_DISABLED=1

# Public API calls stay same-origin; the target above is used only by Next's
# server-side rewrites and is deliberately different in development/UAT/prod.
ENV NEXT_PUBLIC_API_URL=/api
RUN pnpm build

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S -g 1001 nextjs \
    && adduser -S -u 1001 -G nextjs nextjs

COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "node_modules/next/dist/bin/next", "start"]
