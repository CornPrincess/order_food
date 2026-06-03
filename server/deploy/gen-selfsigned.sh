#!/usr/bin/env bash
# 生成自签名证书，仅用于「让 nginx 先能起来 / 内网联调」。
# 正式上线请用阿里云免费证书或 Let's Encrypt 替换（小程序不接受自签证书）。
set -e
DOMAIN="${1:-food.bbmmcc.cn}"
DIR="$(cd "$(dirname "$0")" && pwd)/nginx/ssl"
mkdir -p "$DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$DIR/$DOMAIN.key" \
  -out "$DIR/$DOMAIN.pem" \
  -subj "/CN=$DOMAIN"

echo "已生成自签名证书："
echo "  $DIR/$DOMAIN.pem"
echo "  $DIR/$DOMAIN.key"
echo "提醒：自签证书仅供启动/测试，正式环境务必替换为受信任证书。"
