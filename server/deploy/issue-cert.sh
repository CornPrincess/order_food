#!/usr/bin/env bash
# 用 Let's Encrypt(certbot) 为域名签发免费证书（webroot 方式），并放到 nginx 挂载的 ssl 目录。
# 前置：DNS 已将域名解析到本机公网 IP；docker compose 已起 nginx（80 端口可访问）。
# 用法：bash deploy/issue-cert.sh food.bbmmcc.cn you@example.com
set -e
DOMAIN="${1:-food.bbmmcc.cn}"
EMAIL="${2:?请提供邮箱：bash deploy/issue-cert.sh <域名> <邮箱>}"
BASE="$(cd "$(dirname "$0")" && pwd)/nginx"

# 通过 certbot 容器，使用 nginx 已挂载的 /var/www/certbot 作为验证目录
docker run --rm \
  -v "$BASE/certbot:/var/www/certbot" \
  -v "$BASE/letsencrypt:/etc/letsencrypt" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive

# 拷贝为 nginx 配置里引用的固定文件名
cp "$BASE/letsencrypt/live/$DOMAIN/fullchain.pem" "$BASE/ssl/$DOMAIN.pem"
cp "$BASE/letsencrypt/live/$DOMAIN/privkey.pem"  "$BASE/ssl/$DOMAIN.key"

echo "证书已就绪，重载 nginx ..."
docker compose exec nginx nginx -s reload
echo "完成。访问 https://$DOMAIN/health 验证。"
