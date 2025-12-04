# Dockerfile pour Log My Job PWA
# Version Supabase - Frontend statique uniquement

FROM nginx:alpine

# Installer curl pour le healthcheck
RUN apk add --no-cache curl

# Copier le frontend
COPY frontend/ /usr/share/nginx/html/

# Configuration nginx personnalisee pour SPA
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/health { \
        add_header Content-Type application/json; \
        return 200 "{\"status\": \"ok\", \"storage\": \"supabase\"}"; \
    } \
    \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    location /sw.js { \
        add_header Cache-Control "no-cache"; \
        expires 0; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Exposer le port
EXPOSE 80

# Health check avec curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
