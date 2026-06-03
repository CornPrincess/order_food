#!/usr/bin/env bash
# 首次用 certbot 申请 Let's Encrypt 证书（解决 nginx 与 certbot 的先有鸡还是先有蛋问题）。
# 之后由 compose 里的 certbot 服务自动续期，无需再跑本脚本。
#
# 前置：域名已解析到本机公网 IP；80 端口对公网开放；docker compose 可用。
# 用法：bash deploy/init-letsencrypt.sh
set -e

# ===== 按需修改 =====
DOMAINS=(food.bbmmcc.cn)
EMAIL="admin@bbmmcc.cn"     # 用于证书到期提醒，建议填真实邮箱
STAGING=0                   # 调试时设 1，用 LE 测试环境（不计入签发频率限制）
# ====================

DATA_PATH="./deploy/certbot"
RSA_KEY_SIZE=4096

cd "$(dirname "$0")/.."   # 切到 server/ 目录

if [ ! -e "$DATA_PATH/conf/options-ssl-nginx.conf" ] || [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
  echo "### 下载 nginx 推荐 TLS 参数 ..."
  mkdir -p "$DATA_PATH/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$DATA_PATH/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$DATA_PATH/conf/ssl-dhparams.pem"
fi

domain="${DOMAINS[0]}"
live_path="/etc/letsencrypt/live/$domain"

echo "### 创建临时自签证书让 nginx 能先启动 ..."
mkdir -p "$DATA_PATH/conf/live/$domain"
docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout '$live_path/privkey.pem' \
    -out '$live_path/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo "### 启动 nginx ..."
docker compose up -d nginx

echo "### 删除临时证书 ..."
docker compose run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$domain && \
  rm -Rf /etc/letsencrypt/archive/$domain && \
  rm -Rf /etc/letsencrypt/renewal/$domain.conf" certbot

echo "### 向 Let's Encrypt 申请正式证书 ..."
domain_args=""
for d in "${DOMAINS[@]}"; do domain_args="$domain_args -d $d"; done

case "$EMAIL" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $EMAIL" ;;
esac
[ $STAGING != "0" ] && staging_arg="--staging" || staging_arg=""

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg $email_arg $domain_args \
    --rsa-key-size $RSA_KEY_SIZE --agree-tos --no-eff-email --force-renewal" certbot

echo "### 重载 nginx ..."
docker compose exec nginx nginx -s reload

echo "✅ 完成。访问 https://$domain/health 验证。"
