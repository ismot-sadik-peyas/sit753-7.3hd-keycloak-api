FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PIPELINE_MODE=true
EXPOSE 3030
CMD ["node", "api_email.js"]

