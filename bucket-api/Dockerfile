# stage 1
# FROM node:14.6.0-alpine as builder
# Create app directory
# WORKDIR /usr/app
# # Install app dependencies
# COPY package*.json ./
# RUN npm install
# # Copy source and compile
# COPY . .
# RUN npm run build

# Note: migration does node go through on js, thus getting rid of the first stage for now

# stage 2
FROM node:current-buster
ARG START_COMMAND
ENV START_COMMAND ${START_COMMAND}
# Create app directory
WORKDIR /usr/app
# Install ONLY prod dependencies
COPY package*.json ./
# RUN npm install --production
RUN npm install @mapbox/node-pre-gyp
RUN npm install
# Copy compiled sources
# COPY --from=builder /usr/app/dist ./dist
COPY . .
# Run the production script
CMD npm run ${START_COMMAND}