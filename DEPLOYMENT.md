# Deployment

This production setup targets a low-traffic Lightsail + RDS deployment:

- `web`: Nginx serving the built React app and proxying `/api` to the API container.
- `api`: Fastify RSVP/puzzle API.
- `database`: Amazon RDS PostgreSQL, outside Docker.

The production Docker Compose file intentionally does not run PostgreSQL. RSVP data should live in RDS so it survives app server rebuilds.

## 1. Create RDS PostgreSQL

Create an RDS PostgreSQL database in the same AWS Region as the Lightsail instance.

Recommended small setup:

- Engine: PostgreSQL
- Instance class: `db.t4g.micro` or `db.t4g.small`
- Storage: 20 GB gp3/gp2
- Public access: `No`
- Database name: `wedding`
- Username: `wedding`
- VPC: default VPC for the Region

Keep the RDS endpoint, username, password, and database name for `.env.production`.

## 2. Create Lightsail Instance

Use an Ubuntu Lightsail instance. The `$7/month` plan is a reasonable starting point for Docker, Nginx, and the API.

Open inbound ports in Lightsail networking:

- `22` from your IP for SSH.
- `80` from the internet.
- `443` from the internet if you add HTTPS on the instance.

Attach a Lightsail static IP to the instance.

## 3. Connect Lightsail To RDS

Lightsail connects to RDS through VPC peering.

1. In Lightsail, open `Account -> Advanced`.
2. Enable VPC peering for the same Region as the instance and RDS.
3. In the RDS security group, allow inbound PostgreSQL traffic:
   - Type: PostgreSQL
   - Port: `5432`
   - Source: the Lightsail private CIDR for the peered Region, or the specific private IP/CIDR AWS shows for Lightsail peering.

Do not open RDS to `0.0.0.0/0`.

## 4. Install Docker On Lightsail

SSH into the Lightsail instance and install Docker:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in after adding your user to the `docker` group.

## 5. Configure App

Copy the repo to the Lightsail instance, then create `.env.production`:

```bash
cp .env.production.example .env.production
```

Edit values:

```env
DATABASE_URL=postgres://wedding:your-rds-password@your-rds-endpoint.region.rds.amazonaws.com:5432/wedding?sslmode=verify-full
DATABASE_SSL_CA_FILE=/app/apps/api/certs/global-bundle.pem
WEB_ORIGIN=https://your-domain.example
PHONE_HASH_SECRET=use-a-long-random-secret
BROWSER_TOKEN_SECRET=use-another-long-random-secret
ADMIN_PASSWORD=use-a-strong-admin-password
ADMIN_TOKEN_SECRET=use-a-third-long-random-secret

WEB_HTTP_PORT=80
VITE_RSVP_API_BASE_URL=
```

Generate app secrets:

```bash
openssl rand -hex 32
```

Generate separate values for `PHONE_HASH_SECRET`, `BROWSER_TOKEN_SECRET`, and `ADMIN_TOKEN_SECRET`.
`ADMIN_PASSWORD` guards the `/admin` page, so use a strong value that is not reused elsewhere.

`VITE_RSVP_API_BASE_URL` is intentionally empty. The browser calls same-origin `/api/...`, and Nginx proxies those requests to the API container.
The admin page is served at `/admin`; Nginx falls back to the React app for that route, and the browser authenticates against `/api/admin/login`.

## 6. Start

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Check status:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl http://localhost/health
```

View logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
```

## 7. Update

After pulling new code:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 8. Database Backup

Use RDS automated backups. For manual exports, run `pg_dump` from the Lightsail instance after installing the PostgreSQL client:

```bash
sudo apt-get install -y postgresql-client
pg_dump "$DATABASE_URL" > wedding-backup.sql
```

## 9. HTTPS

The simplest HTTPS setup is Cloudflare in front of Lightsail:

1. Point your domain to the Lightsail static IP.
2. Enable Cloudflare proxy.
3. Set SSL mode to `Full`.

If you do not use Cloudflare, install Caddy or Certbot/Nginx on the host and proxy HTTPS traffic to `localhost:80`.
