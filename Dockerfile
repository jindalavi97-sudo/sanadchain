FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

RUN npm ci --workspace=@sanadchain/api --omit=dev

COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY database ./database
COPY blockchain ./blockchain

EXPOSE 3000

CMD ["npm", "start", "-w", "@sanadchain/api"]
