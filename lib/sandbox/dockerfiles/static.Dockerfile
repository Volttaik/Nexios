FROM node:20-alpine

LABEL maintainer="Nexios AI Sandbox"
LABEL version="1.0"
LABEL description="Nexios static web server image"

RUN npm install -g serve

WORKDIR /workspace

COPY . .

EXPOSE 3000

CMD ["serve", "-s", ".", "-l", "3000"]
