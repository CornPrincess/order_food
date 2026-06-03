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

### 3. 把 food.bbmmcc.cn 扩展进现有 bbmmcc.cn 证书（同主域，复用一张证书）

food.bbmmcc.cn 与博客同属 `bbmmcc.cn` 主域，现有证书已覆盖
`bbmmcc.cn / api.bbmmcc.cn / media.bbmmcc.cn`。直接 `--expand` 把 food
加进这张已经在正常工作的证书，走的是已验证可用的签发路径：

```bash
# 先清掉之前失败尝试可能残留的 food 续签配置（没有则忽略报错）
docker exec cc_blog_certbot certbot delete --cert-name food.bbmmcc.cn --non-interactive 2>/dev/null || true

# 扩展现有 bbmmcc.cn 证书，列出全部 SAN + 新增 food
docker exec -it cc_blog_certbot certbot certonly \
  --authenticator dns-aliyun \
  --dns-aliyun-credentials /etc/certbot/aliyun.ini \
  --dns-aliyun-propagation-seconds 60 \
  --cert-name bbmmcc.cn \
  -d bbmmcc.cn -d api.bbmmcc.cn -d media.bbmmcc.cn -d food.bbmmcc.cn \
  --non-interactive --agree-tos -m xiaocorn96@gmail.com --no-eff-email --expand
```

证书仍在 `/etc/letsencrypt/live/bbmmcc.cn/`，nginx 已只读挂载该 volume；
续签由 certbot 的 `certbot renew` 循环按存储的 4 个域名自动续，无需额外配置。

> 注：不建议为 food 单独 `certonly -d food.bbmmcc.cn` 新建独立证书——实测会偶发
> ACME 端 `No such authorization`（新建订单后 authz 取回 404，Boulder 瞬时不一致）。
> 若坚持独立证书，遇到该错误重试 2~3 次即可，但同主域用一张证书更省心。

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

## 数据维护

### 清理已下线的忌口标签（如「姜 / 茄子 / 苦瓜」）

忌口/口味是按成员**数据库里真实存储的值**聚合后用于菜单提示的。仅从前端可选项里
移除某标签**不会**清掉成员档案里已保存的旧值，菜单仍会出现「家人忌口：姜」之类提示。
需一次性清库（对所有成员生效，立即消除对应提示）：

```bash
cd server
docker compose exec mongo mongosh order_food --quiet --eval \
  'print(db.users.updateMany({}, { $pull: { dislikes: { $in: ["姜","茄子","苦瓜"] } } }).modifiedCount + " 个成员已清理")'
```

> 前端自 commit 起，`tasteMap/dislikeMap` 只保留当前可选项内的值，残留项不再被写回；
> 任意成员打开「我的」页保存一次也会自动剔除其档案里的旧值。清库命令用于立即全量生效。

## 回滚

```bash
rm cc_blog/nginx/templates/food.conf.template
docker exec cc_blog_nginx nginx -s reload
cd server && docker compose down
```
