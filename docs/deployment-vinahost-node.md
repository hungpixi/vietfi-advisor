# Deployment To Vinahost

## Muc tieu

Repo nay khong con deploy qua Vercel. Production duoc tu dong deploy tu GitHub Actions sang host Vinahost ma khong lo thong tin server cho collaborator.

## Tai sao khong dung FTP static

App hien tai la Next.js co runtime server:

- `src/app/api/chat/route.ts`
- `src/app/api/news/route.ts`
- `src/app/api/cron/morning-brief/route.ts`
- `src/app/auth/confirm/route.ts`
- `src/lib/supabase/server.ts`

Vi vay khong the chi upload file static nhu Astro site.

## Kieu deploy duoc ho tro

Dung cPanel Node.js App hoac mot Node runtime tuong duong tren Vinahost.

Yeu cau toi thieu tren host:

1. Co SSH access.
2. Co Node.js app runtime.
3. App root da duoc tao san, vi du: `~/vietfi`
4. Startup file trong cPanel dat la `server.cjs`
5. Sau moi lan deploy chi can `touch tmp/restart.txt`

## GitHub Actions

### CI

Workflow `CI` se chay:

1. `npm ci`
2. `npm run lint`
3. `npm run test:run`
4. `npm run build`

### Deploy

Workflow `Deploy VietFi To Vinahost` se:

1. Package source code
2. Upload qua SSH
3. Giai nen vao app dir
4. Ghi `.env.production` tu GitHub Secret
5. `npm ci`
6. `npm run build`
7. restart Node app

## Secrets can tao trong repo

Tat ca phai la GitHub Secrets, khong dung Variables cho server info.

- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_APP_DIR`
- `DEPLOY_TMP_DIR`
- `APP_ENV_PRODUCTION`

## Gia tri goi y

Neu app root tren cPanel la `~/vietfi`:

- `DEPLOY_PORT=22`
- `DEPLOY_APP_DIR=/home/<cpanel-user>/vietfi`
- `DEPLOY_TMP_DIR=/home/<cpanel-user>/tmp`

`APP_ENV_PRODUCTION` phai la noi dung day du cua file `.env.production`.

## Bao mat cho team

Collaborator co the push code va mo PR, nhung khong doc duoc GitHub Secrets.

Khuyen nghi them:

1. Chi auto deploy khi merge vao `master`
2. Dung `production` environment tren GitHub
3. Neu can, bat required reviewers cho environment production

## Setup cPanel can lam 1 lan

1. Tao Node.js app cho subdomain `vietfi.phamphunguyenhung.com`
2. Chon app root dung voi `DEPLOY_APP_DIR`
3. Chon startup file `server.cjs`
4. Dat Node version khop voi workflow, uu tien Node 20
5. Sau khi setup xong, de GitHub Actions lo phan cap nhat code
