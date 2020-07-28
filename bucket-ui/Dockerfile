# stage1 as builder
FROM node:10-alpine as builder

# copy the package.json to install dependencies
COPY package.json package-lock.json ./

# Install the dependencies and make the folder
RUN npm install && mkdir /bucket-ui && mv ./node_modules ./bucket-ui

WORKDIR /bucket-ui

COPY . .

# Build the project and copy the files
RUN npm run build -- —-base-href="/bucket" --prod


FROM nginx:alpine

#!/bin/sh

COPY ./.nginx/nginx.conf /etc/nginx/nginx.conf

## Remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

# Copy from the stahg 1
COPY --from=builder /bucket-ui/dist /usr/share/nginx/html

ENTRYPOINT ["nginx", "-g", "daemon off;"]