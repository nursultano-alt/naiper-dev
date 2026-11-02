@echo off
chcp 65001 > nul
echo ========================================================
echo  🚀 ДЕПЛОЙ НОВОГОДНЕГО ПОРТАЛА 2027 НА CLOUDFLARE
echo ========================================================
echo.

echo [1/4] Сборка чистого production-бандла...
call node build_dist.mjs
if %ERRORLEVEL% NEQ 0 (
    echo [X] Ошибка сборки бандла! Деплой остановлен.
    pause
    exit /b 1
)

echo.
echo [2/4] Запуск интеграционных тестов облачной базы данных...
call node test_portal_sync.mjs
if %ERRORLEVEL% NEQ 0 (
    echo [X] Тесты провалены! Деплой отменен для безопасности базы.
    pause
    exit /b 1
)

echo.
echo [3/4] Проверка авторизации в Cloudflare Wrangler...
call npx wrangler whoami > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Вы еще не авторизованы в Cloudflare Wrangler на этом компьютере.
    echo [!] Сейчас откроется окно браузера для разового входа в Cloudflare...
    echo.
    call npx wrangler login
)

echo.
echo ========================================================
echo  Выберите метод деплоя на живой домен:
echo  1. Cloudflare Worker с ассетами (по умолчанию: npx wrangler deploy)
echo  2. Cloudflare Pages (npx wrangler pages deploy dist)
echo  3. Открыть папку dist и дашборд Cloudflare для ручной загрузки
echo ========================================================
set /p DEPLOY_CHOICE="Введите номер [1, 2 или 3, Enter = 1]: "

if "%DEPLOY_CHOICE%"=="2" (
    echo.
    echo Выкатка через Cloudflare Pages...
    call npx wrangler pages deploy dist --project-name=naiper-dev
) else if "%DEPLOY_CHOICE%"=="3" (
    echo.
    echo Открываем дашборд Cloudflare и папку с готовым zip-архивом...
    explorer .
    start https://dash.cloudflare.com/
    echo Перетащите архив dist_production_bundle.zip в дашборд Cloudflare Pages!
) else (
    echo.
    echo Выкатка через Cloudflare Worker с ассетами dist...
    call npx wrangler deploy
)

echo.
echo [4/4] ========================================================
echo  Аудит живых доменов naiper.dev и cholponkanewyear.naiper.dev...
echo ========================================================
call node verify_live_prod.mjs

echo.
echo ========================================================
echo  Деплой завершен!
echo ========================================================
pause
