# Deploying to Oracle Cloud (free tier)

The site runs as one Docker container behind Caddy on an Always Free Ampere A1 VM. Caddy handles HTTPS. Every push to `main` builds an ARM image on GitHub Actions, pushes it to GHCR, and (once enabled) the VM pulls it and restarts.

## 1. Create the VM

1. Oracle Cloud console → Compute → Instances → Create.
2. Image: **Ubuntu 24.04**. Shape: **VM.Standard.A1.Flex** (Ampere). 1 OCPU and 6 GB RAM is plenty.
3. Add your SSH public key. Note the public IP.
4. Networking → your VCN → Security List → add ingress rules for TCP **80** and **443** from `0.0.0.0/0`.

## 2. Prepare the VM

```bash
ssh ubuntu@<VM_IP>

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

# Ubuntu images on Oracle block ports with iptables, on top of the security list
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

mkdir -p ~/portfolio
```

Create `~/portfolio/.env` on the VM (see `.env.example` in the repo root):

```bash
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b
RADIO_DAILY_CAP=800
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
DOMAIN=yourdomain.com      # or :80 if you have no domain yet
```

### Licensed assets

The Racero font isn't in the public repo. Copy it from your machine to the VM once:

```bash
ssh ubuntu@<VM_IP> "mkdir -p ~/portfolio/assets"
scp public/fonts/racero.otf ubuntu@<VM_IP>:~/portfolio/assets/racero.otf
```

`docker-compose.yml` mounts it into the container. Without it the site still works with a fallback font.

## 3. Domain (optional but recommended)

Point an `A` record for your domain at the VM's IP. Caddy gets the certificate on first start. No domain yet? Use `DOMAIN=:80` and open `http://<VM_IP>`.

## 4. Wire up GitHub

In the repo → Settings → Secrets and variables → Actions:

- Secrets: `ORACLE_HOST` (VM IP), `ORACLE_USER` (`ubuntu`), `ORACLE_SSH_KEY` (a private key whose public half is in the VM's `~/.ssh/authorized_keys`)
- Variables: `SITE_URL` (`https://yourdomain.com`), `DEPLOY_ENABLED` = `true`

After the first build, make the image pullable: GitHub → your profile → Packages → `portfolio-website` → Package settings → change visibility to **Public**. (Or run `docker login ghcr.io` on the VM with a token that has `read:packages`.)

## 5. Ship

Push to `main`, or run the workflow by hand from the Actions tab. To deploy manually from the VM:

```bash
cd ~/portfolio && docker compose pull && docker compose up -d
```

Logs: `docker compose logs -f web`.
