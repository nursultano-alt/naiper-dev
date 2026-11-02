@echo off
chcp 65001 > nul
echo ========================================================
echo  🚀 ДЕПЛОЙ НОВОГОДНЕГО ПОРТАЛА 2027 НА CLOUDFLARE
echo ========================================================
echo.
echo Проверка авторизации в Cloudflare Wrangler...
call npx wrangler whoami > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Вы еще не авторизованы в Wrangler.
    echo [!] Открываем браузер для авторизации Cloudflare...
    call npx wrangler login
)

echo.
echo Запуск сборки и выкатки продакшн-воркера с ассетами...
call npx wrangler deploy

echo.
echo ========================================================
echo  Проверка статуса живого домена...
echo ========================================================
node verify_live_prod.mjs
echo.
pause
