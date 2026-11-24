# Imagen del microservicio de turnos
FROM node:24-alpine

ENV NODE_ENV=production
ENV TZ=America/Argentina/Buenos_Aires

# Datos de zonas horarias (Alpine no los trae). Sin esto el reloj del contenedor quedaría en hora UTC,
# y la validación "no se puede reservar en el pasado" fallaría de noche.
RUN apk add --no-cache tzdata

WORKDIR /app

# 1) Primero solo los archivos de dependencias. Si no cambian, Docker reutiliza esta capa
#    y las construcciones siguientes son mucho más rápidas.
COPY microservicio-turnos/package.json microservicio-turnos/package-lock.json ./
RUN npm ci --omit=dev

# 2) Después el código de la aplicación
COPY microservicio-turnos/src ./src

# Por seguridad, el programa corre como un usuario sin privilegios (no como administrador)
USER node

EXPOSE 3001
CMD ["node", "src/app.js"]