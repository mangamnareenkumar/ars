FROM node:20.19.3-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy the entire repo (for workspace context)
COPY . .

# Install only backend workspace
RUN npm install --workspace=backend

# Set working directory to backend
WORKDIR /app/backend

EXPOSE 5000
CMD ["npm", "start", "--workspace=backend"]
