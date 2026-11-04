# Dockerfile pour Log My Job PWA
# Frontend statique servi par nginx, donnees dans Supabase

FROM nginx:alpine

# curl pour le healthcheck
RUN apk add --no-cache curl

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
