# stage 1
FROM node:14.6.0-alpine as builder
# Create app directory
WORKDIR /usr/app
# Install app dependencies
COPY package*.json ./
RUN npm install
# Copy source and compile
COPY . .
RUN npm run build

# stage 2
FROM node:14.6.0-alpine
# Create app directory
WORKDIR /usr/app
# Install ONLY prod dependencies
COPY package*.json ./
RUN npm install --production
# Copy compiled sources
COPY --from=builder /usr/app/dist ./dist
# Run the production script
CMD [ "npm", "run", "prod" ]