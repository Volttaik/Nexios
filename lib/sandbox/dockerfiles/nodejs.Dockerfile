FROM node:20-alpine

LABEL maintainer="Nexios AI Sandbox"
LABEL version="1.0"
LABEL description="Nexios Node.js 20 runtime image"

WORKDIR /workspace

RUN apk add --no-cache bash curl git

ENV NODE_ENV=development
ENV NPM_CONFIG_LOGLEVEL=warn

COPY . .

RUN if [ -f "package.json" ]; then npm install; fi

EXPOSE 3000 8080

CMD ["node", "index.js"]
