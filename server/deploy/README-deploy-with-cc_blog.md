# order_food 后端部署（复用 cc_blog 的 nginx + certbot）

服务器上已有 cc_blog 的整套 docker-compose（`cc_blog_nginx` 独占 80/443，
`cc_blog_certbot` 用阿里云 DNS-01 签证书）。order_food 后端**不再自带 nginx/certbot**，
而是作为一个 upstream 挂在 cc_blog 的 nginx 后面，域名 `food.bbmmcc.cn`。

```
小程序 ──https──> cc_blog_nginx ──> order_food_app:3000 (同一 docker 网络)
                  cc_blog_certbot ──DNS-01──> 单独签 food.bbmmcc.cn 证书
```

## 前置条件

- `bbmmcc.cn` 托管在 certbot 所用 AK 对应的**同一个阿里云 DNS 账号**下。
- `food.bbmmcc.cn` 已加 A 记录指向服务器公网 IP。
- `food.bbmmcc.cn` 已完成 **ICP 备案**（大陆服务器 80/443 强制）。
- 小程序后台「request 合法域名」已加入 `https://food.bbmmcc.cn`。

## 部署步骤

### 1. 确认 cc_blog 网络名

```bash
docker network ls | grep internal      # 通常是 cc_blog_internal
```

若不是 `cc_blog_internal`，改 `server/docker-compose.yml` 里 `networks.cc_blog_internal.name`。

### 2. 启动 order_food 后端（加入共享网络，不暴露端口）

```bash
cd server
# 准备好 .env（参考 .env / README）
docker compose up -d --build
docker compose exec app wget -qO- http://localhost:3000/health   # 自检
```

### 3. 单独签发 food.bbmmcc.cn 证书（用现有 certbot 容器，一次性）

```bash
docker exec -it cc_blog_certbot certbot certonly \
  --authenticator dns-aliyun \
  --dns-aliyun-credentials /etc/certbot/aliyun.ini \
  --dns-aliyun-propagation-seconds 60 \
  -d food.bbmmcc.cn \
  --non-interactive --agree-tos -m <你的邮箱> --no-eff-email
```

证书写入共享 volume `certbot_certs`，nginx 已只读挂载；续签由 certbot 的
`certbot renew` 循环自动覆盖，无需额外配置。

### 4. 加载 nginx 路由（food.conf.template 已在 cc_blog/nginx/templates/）

nginx 容器启动时会用 envsubst 把 templates 渲染进 conf.d。新增模板后需重建/重载：

```bash
# 在 cc_blog 目录
docker compose -f docker-compose.prod.yml up -d nginx     # 重新渲染模板
# 或仅热重载（若证书/配置已就位）：
docker exec cc_blog_nginx nginx -t && docker exec cc_blog_nginx nginx -s reload
```

### 5. 验证

```bash
curl -I https://food.bbmmcc.cn/health
```

## 回滚

```bash
rm cc_blog/nginx/templates/food.conf.template
docker exec cc_blog_nginx nginx -s reload
cd server && docker compose down
```
