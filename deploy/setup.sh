#!/bin/bash
# Run once on a fresh Ubuntu 22.04 EC2 instance.
# Usage: bash setup.sh <github-repo-url> <your-domain-or-ip>
# Example: bash setup.sh https://github.com/benluedtke/rogue-site.git benluedtke.com

set -e

REPO_URL=${1:?"Usage: $0 <github-repo-url> <domain-or-ip>"}
DOMAIN=${2:?"Usage: $0 <github-repo-url> <domain-or-ip>"}
APP_DIR=/var/www/rogue-site

echo "--- Updating system ---"
sudo apt-get update -q && sudo apt-get upgrade -y -q

echo "--- Installing dependencies ---"
sudo apt-get install -y -q python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git

echo "--- Cloning repo ---"
sudo mkdir -p "$APP_DIR"
sudo chown ubuntu:ubuntu "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR"

echo "--- Setting up Python environment ---"
cd "$APP_DIR"
python3 -m venv venv
venv/bin/pip install -r requirements.txt -q

echo "--- Creating .env file ---"
SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
echo "SECRET_KEY=$SECRET" > "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

echo "--- Setting up log directory ---"
sudo mkdir -p /var/log/rogue-site
sudo chown ubuntu:ubuntu /var/log/rogue-site

echo "--- Installing systemd service ---"
sudo cp "$APP_DIR/deploy/rogue-site.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable rogue-site
sudo systemctl start rogue-site

echo "--- Configuring Nginx ---"
sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/rogue-site
sudo sed -i "s/YOUR_DOMAIN_OR_IP/$DOMAIN/g" /etc/nginx/sites-available/rogue-site
sudo ln -sf /etc/nginx/sites-available/rogue-site /etc/nginx/sites-enabled/rogue-site
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Only run certbot if a real domain was given (not a raw IP)
if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "--- Skipping SSL (raw IP — point a domain at this server first, then run certbot) ---"
    echo "    sudo certbot --nginx -d $DOMAIN"
else
    echo "--- Obtaining SSL certificate ---"
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "ben@bluedtke.com"
fi

echo ""
echo "Done. Service status:"
sudo systemctl status rogue-site --no-pager
