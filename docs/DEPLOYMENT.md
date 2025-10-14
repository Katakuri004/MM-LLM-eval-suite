# LMMS-Eval Dashboard Deployment Guide

## Overview

This guide covers deploying the LMMS-Eval Dashboard in various environments, from local development to production clusters.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ and npm/yarn
- Python 3.11+
- Supabase account and project
- GPU-enabled machine (for evaluation runs)

## Local Development

### 1. Clone Repository
```bash
git clone <repository-url>
cd gui-test-suite
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp env.example .env
# Configure your Supabase credentials in .env
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Configure your API URLs in .env.local
```

### 4. Database Setup
```bash
# Run database migrations
cd backend
python scripts/migrate.py
```

### 5. Start Development Servers
```bash
# Terminal 1: Backend
cd backend && python main.py

# Terminal 2: Frontend
cd frontend && npm run dev
```

## Docker Deployment

### 1. Environment Configuration
Create a `.env` file in the project root:
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Security
SECRET_KEY=your_secret_key_here

# Optional: Redis URL
REDIS_URL=redis://redis:6379
```

### 2. Start Services
```bash
docker-compose up -d
```

### 3. Verify Deployment
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:3000
```

## Production Deployment

### 1. Environment Variables
Set the following environment variables:
```bash
# Supabase
SUPABASE_URL=your_production_supabase_url
SUPABASE_KEY=your_production_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Security
SECRET_KEY=your_production_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis
REDIS_URL=redis://redis:6379

# GPU Configuration
AVAILABLE_GPUS=["cuda:0", "cuda:1", "cuda:2", "cuda:3"]
DEFAULT_COMPUTE_PROFILE=4070-8GB

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=INFO
```

### 2. Database Migration
```bash
# Run migrations
docker-compose exec backend python scripts/migrate.py
```

### 3. SSL Configuration
Create SSL certificates and update nginx configuration:
```bash
# Generate SSL certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/nginx.key -out ssl/nginx.crt

# Update nginx.conf for SSL
```

### 4. Production Docker Compose
```yaml
version: '3.8'

services:
  frontend:
    image: your-registry/lmms-eval-frontend:latest
    ports:
      - "80:80"
      - "443:443"
    environment:
      - REACT_APP_API_URL=https://your-domain.com/api/v1
      - REACT_APP_WS_URL=wss://your-domain.com
    volumes:
      - ./ssl:/etc/nginx/ssl
    restart: unless-stopped

  backend:
    image: your-registry/lmms-eval-backend:latest
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SECRET_KEY=${SECRET_KEY}
      - REDIS_URL=redis://redis:6379
      - DEBUG=false
      - RELOAD=false
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: unless-stopped
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  lmms-eval-runner:
    image: your-registry/lmms-eval-runner:latest
    environment:
      - CUDA_VISIBLE_DEVICES=0,1,2,3
    volumes:
      - ./data:/data
      - ./artifacts:/artifacts
      - ./logs:/app/logs
    restart: unless-stopped
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

volumes:
  redis_data:
```

## Kubernetes Deployment

### 1. Create Namespace
```bash
kubectl create namespace lmms-eval
```

### 2. Deploy ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lmms-eval-config
  namespace: lmms-eval
data:
  SUPABASE_URL: "your_supabase_url"
  SUPABASE_KEY: "your_supabase_key"
  REDIS_URL: "redis://redis:6379"
  DEBUG: "false"
  RELOAD: "false"
```

### 3. Deploy Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lmms-eval-secrets
  namespace: lmms-eval
type: Opaque
data:
  SUPABASE_SERVICE_ROLE_KEY: <base64-encoded-key>
  SECRET_KEY: <base64-encoded-secret>
```

### 4. Deploy Services
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lmms-eval-backend
  namespace: lmms-eval
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lmms-eval-backend
  template:
    metadata:
      labels:
        app: lmms-eval-backend
    spec:
      containers:
      - name: backend
        image: your-registry/lmms-eval-backend:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: lmms-eval-config
        - secretRef:
            name: lmms-eval-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: lmms-eval-backend
  namespace: lmms-eval
spec:
  selector:
    app: lmms-eval-backend
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
```

### 5. Deploy Frontend
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lmms-eval-frontend
  namespace: lmms-eval
spec:
  replicas: 2
  selector:
    matchLabels:
      app: lmms-eval-frontend
  template:
    metadata:
      labels:
        app: lmms-eval-frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/lmms-eval-frontend:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: lmms-eval-frontend
  namespace: lmms-eval
spec:
  selector:
    app: lmms-eval-frontend
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

### 6. Deploy Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lmms-eval-ingress
  namespace: lmms-eval
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: lmms-eval-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lmms-eval-frontend
            port:
              number: 3000
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: lmms-eval-backend
            port:
              number: 8000
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: lmms-eval-backend
            port:
              number: 8000
```

## Monitoring and Logging

### 1. Prometheus Configuration
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: lmms-eval
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'lmms-eval-backend'
      static_configs:
      - targets: ['lmms-eval-backend:8000']
      metrics_path: /metrics
      scrape_interval: 5s
```

### 2. Grafana Dashboard
Import the provided Grafana dashboard configuration for monitoring:
- Application metrics
- GPU utilization
- Database performance
- WebSocket connections

### 3. Log Aggregation
Configure log aggregation using ELK stack or similar:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: lmms-eval
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*lmms-eval*
    output.elasticsearch:
      hosts: ["elasticsearch:9200"]
```

## Security Considerations

### 1. Network Security
- Use TLS/SSL for all communications
- Implement proper firewall rules
- Use VPN for internal communications

### 2. Authentication
- Enable Supabase Auth with strong password policies
- Implement rate limiting
- Use JWT tokens with appropriate expiration

### 3. Data Protection
- Encrypt sensitive data at rest
- Use secure communication protocols
- Implement proper access controls

### 4. Container Security
- Use non-root users in containers
- Regular security updates
- Scan containers for vulnerabilities

## Backup and Recovery

### 1. Database Backup
```bash
# Create backup
pg_dump -h localhost -U postgres -d lmms_eval > backup.sql

# Restore backup
psql -h localhost -U postgres -d lmms_eval < backup.sql
```

### 2. File Storage Backup
```bash
# Backup uploads and artifacts
tar -czf artifacts-backup.tar.gz ./uploads ./artifacts

# Restore backup
tar -xzf artifacts-backup.tar.gz
```

### 3. Automated Backups
Set up automated backups using cron jobs or Kubernetes CronJobs:
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: lmms-eval-backup
  namespace: lmms-eval
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h postgres -U postgres -d lmms_eval > /backup/backup-$(date +%Y%m%d).sql
              aws s3 cp /backup/backup-$(date +%Y%m%d).sql s3://your-backup-bucket/
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check Supabase credentials
   - Verify network connectivity
   - Check database permissions

2. **GPU Allocation Issues**
   - Verify GPU availability
   - Check CUDA installation
   - Verify Docker GPU support

3. **WebSocket Connection Issues**
   - Check firewall settings
   - Verify proxy configuration
   - Check CORS settings

4. **Performance Issues**
   - Monitor resource usage
   - Check database performance
   - Optimize queries

### Debug Commands

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend

# Check database connectivity
docker-compose exec backend python -c "from database import db_manager; print(db_manager.health_check())"

# Test API endpoints
curl -X GET http://localhost:8000/health

# Check GPU availability
nvidia-smi
```

## Scaling

### Horizontal Scaling
- Increase replica count for backend services
- Use load balancer for frontend
- Implement database read replicas

### Vertical Scaling
- Increase CPU and memory limits
- Optimize database queries
- Use caching for frequently accessed data

### Auto-scaling
Configure Kubernetes HPA for automatic scaling:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: lmms-eval-backend-hpa
  namespace: lmms-eval
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: lmms-eval-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```
