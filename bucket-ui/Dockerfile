# stage1 as builder
FROM node:lts-alpine as builder
ARG CONFIGURATION

# copy the package.json to install dependencies
COPY package*.json ./

# Install the dependencies and make the folder
RUN npm install && mkdir /bucket-ui && mv ./node_modules ./bucket-ui

WORKDIR /bucket-ui

COPY . .

# Build the project and copy the files
RUN npm run build -- --configuration ${CONFIGURATION}

FROM nginx:1.19

#!/bin/sh

COPY ./nginx/ /etc/nginx/

## Remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

# Copy from the stahg 1
COPY --from=builder /bucket-ui/dist /usr/share/nginx/html/bucket

CMD ["nginx", "-g", "daemon off;"]