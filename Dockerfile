FROM oven/bun:1.1.27 AS base
WORKDIR /app

# Install dependencies in a dedicated layer for building.
FROM base AS deps
COPY package.json ./
RUN bun install

# Build the Next.js application as a standalone server.
FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL="https://imgur.plen.io"
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN SKIP_ENV_VALIDATION=1 bun run build

# Final runtime image with only the necessary assets.
FROM base AS runner
ARG NEXT_PUBLIC_SITE_URL="https://imgur.plen.io"
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=4000 \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

RUN addgroup --gid 1001 nodejs \
    && adduser --disabled-password --gecos "" --ingroup nodejs --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p .next/cache && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 4000

CMD ["bun", "server.js"]
