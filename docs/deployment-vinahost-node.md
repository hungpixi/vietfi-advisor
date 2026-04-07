# Deployment To Vinahost

## Muc tieu

Repo nay khong con deploy qua Vercel. Production duoc tu dong deploy tu GitHub Actions sang host Vinahost ma khong lo thong tin server cho collaborator.

## Tai sao khong dung static hosting thuong

App hien tai la Next.js co runtime server:

- `src/app/api/chat/route.ts`
- `src/app/api/news/route.ts`
- `src/app/api/cron/morning-brief/route.ts`
- `src/app/auth/confirm/route.ts`
- `src/lib/supabase/server.ts`

Vi vay khong the chi upload file static nhu Astro site.

## Kieu deploy duoc ho tro

Dung cPanel Node.js App, nhung deploy bang FTP.

Yeu cau toi thieu tren host:

1. Co Node.js app runtime trong cPanel.
2. App root da duoc tao san, vi du: `~/vietfi`
3. Startup file trong cPanel dat la `server.js`
4. Co FTP account upload duoc vao app root.
5. Passenger restart bang `tmp/restart.txt`

## GitHub Actions

### CI

Workflow `CI` se chay:

1. `npm ci`
2. `npm run build`

### Deploy

Workflow `Deploy VietFi To Vinahost` se:

1. Build Next.js tren GitHub Actions
2. Tao bundle `standalone`
3. Ghi `.env.production` tu GitHub Secret
4. Upload bundle qua FTP vao app root
5. Upload `tmp/restart.txt` de Node app tu restart

## Secrets can tao trong repo

Tat ca phai la GitHub Secrets.

- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_SERVER_DIR`
- `APP_ENV_PRODUCTION`

## Gia tri goi y

Neu app root tren cPanel la `~/vietfi`:

- `FTP_SERVER=phamphunguyenhung.com`
- `FTP_SERVER_DIR=./vietfi/`

`APP_ENV_PRODUCTION` phai la noi dung day du cua file `.env.production`.

## Bao mat cho team

Collaborator co the push code va mo PR, nhung khong doc duoc GitHub Secrets.

Khuyen nghi them:

1. Chi auto deploy khi merge vao `master`
2. Dung `Production` environment tren GitHub
3. Neu can, bat required reviewers cho environment production

## Setup cPanel can lam 1 lan

1. Tao Node.js app cho subdomain `vietfi.phamphunguyenhung.com`
2. Chon app root dung voi folder subdomain, vi du `vietfi`
3. Chon startup file `server.js`
4. Dat Node version khop voi workflow, uu tien Node 20
5. Tao hoac sua app environment vars neu cPanel bat buoc
6. Sau khi setup xong, de GitHub Actions lo phan cap nhat code
