# Create image based on Node 8
FROM node:9

# Change directory to run commands
WORKDIR /Chronos

# Copy dependency file
COPY package*.json /Chronos

# Install dependencies
RUN npm install

# Install pm2 globally
RUN npm install -g pm2

# Get code
COPY ./ /Chronos/

# Expose ports
EXPOSE 3000 8008

# Serve
RUN npm run-script start