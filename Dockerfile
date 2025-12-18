FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat ca-certificates

# Install dependencies in a dedicated layer for building.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build the Next.js application as a standalone server.
FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL="https://imgur.plen.io"
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN SKIP_ENV_VALIDATION=1 npm run build

# Final runtime image with only the necessary assets.
FROM base AS runner
ARG NEXT_PUBLIC_SITE_URL="https://imgur.plen.io"
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=4000 \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p .next/cache && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 4000

CMD ["node", "server.js"]
