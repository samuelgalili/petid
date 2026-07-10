FROM node:20-alpine

WORKDIR /app

ARG RDS_CA_BUNDLE_URL=https://truststore.pki.rds.amazonaws.com/eu-central-1/eu-central-1-bundle.pem
ARG RDS_CA_BUNDLE_SHA256=56a0cae044b6cc433971d964347401692a92ea0294e392753a3ebdaee54d8b84
RUN apk add --no-cache ca-certificates wget \
  && wget --https-only --quiet --output-document=/etc/ssl/certs/aws-rds-eu-central-1-bundle.pem "$RDS_CA_BUNDLE_URL" \
  && echo "$RDS_CA_BUNDLE_SHA256  /etc/ssl/certs/aws-rds-eu-central-1-bundle.pem" | sha256sum -c - \
  && chmod 0444 /etc/ssl/certs/aws-rds-eu-central-1-bundle.pem

ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/aws-rds-eu-central-1-bundle.pem

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src
COPY sql ./sql

ENV PORT=3000
EXPOSE 3000

USER node

CMD ["npm", "start"]
