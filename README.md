# LifeOS

Персональный органайзер: цели, привычки, здоровье, финансы, календарь,
заметки, обучение и AI-ассистент.

Фронтенд — React + Vite + TypeScript + Tailwind (как было).
Backend — **Node.js + Express + TypeScript + Prisma + SQLite** (`server/`),
данные больше не хранятся в localStorage браузера, а в настоящей базе данных.
Локально используется SQLite. Для production добавлена отдельная Prisma-схема
`server/prisma/schema.postgres.prisma`, чтобы деплоить на Neon Postgres без
ручного редактирования локальной SQLite-схемы.

## Структура проекта

```
├── src/              — фронтенд (React: views, components, API-клиент и store)
├── server/           — backend (Express + Prisma + SQLite locally / Postgres in production)
│   ├── prisma/        — schema.prisma, миграции, seed-скрипт и локальная БД
│   └── src/           — роуты, валидации, авторизация, AI и Prisma-клиент
├── .env.example       — публичные переменные фронтенда
├── server/.env.example — переменные backend (секреты только здесь)
├── render.yaml        — blueprint для бесплатного Render backend
├── vercel.json        — Vercel build config для frontend
└── vite.config.ts     — dev-прокси /api → backend на порту 8787
```

## Первоначальная установка (один раз)

Нужен установленный **Node.js 20+**.

```bash
# 1. Установить зависимости фронтенда и backend
npm install
npm --prefix server install

# 2. Настроить backend: скопировать пример .env и создать базу данных
cp server/.env.example server/.env
npm --prefix server run migrate     # создаёт server/dev.db (SQLite) по схеме Prisma
npm --prefix server run seed        # сейчас демо-данные отключены, команда безопасно ничего не создаёт
```

Чтобы сгенерировать безопасный JWT-секрет, выполните `openssl rand -base64 48` и
вставьте результат в `server/.env` в `JWT_SECRET`.

## Запуск (каждый раз при разработке)

```bash
npm run dev
```

Эта одна команда поднимает **и backend (порт 8787), и фронтенд (порт 3000)**
одновременно (через `concurrently`). Откройте http://localhost:3000 —
запросы фронтенда к `/api/...` автоматически проксируются на backend
(настроено в `vite.config.ts`), так что всё работает "из коробки" на одном адресе.

Если нужно поднять их по отдельности:

```bash
npm run server       # только backend, http://localhost:8787
npm run dev:frontend # только фронтенд, http://localhost:3000
```

## Вход в приложение

На экране входа можно:
- Зарегистрировать новый аккаунт (кнопка "Register") — email/пароль сохранятся
  в базе данных, затем LifeOS отправит 6-значный код подтверждения. JWT-сессия
  выдаётся только после правильного кода, поэтому несуществующий email не сможет
  войти в приложение.
- Войти под уже созданным и подтверждённым аккаунтом.

Сессия хранится как JWT-токен в `localStorage` браузера (только токен — не данные).
Кнопка **Log Out** — в Settings → Personal Data.

Локально, если `RESEND_API_KEY` не задан, verification code печатается в логах
backend и возвращается как `devCode` в ответе `/api/auth/register`. В production
код отправляется только через email-провайдера:

```env
RESEND_API_KEY=""
EMAIL_FROM="LifeOS <onboarding@your-domain.com>"
APP_NAME="LifeOS"
```

Если `NODE_ENV=production` и `RESEND_API_KEY` пустой, backend не будет делать
вид, что письмо отправлено: регистрация вернёт ошибку отправки.

## AI Assistant

AI requests go through the backend (`POST /api/ai/chat`). The frontend never
stores provider keys. Configure one provider in `server/.env`:

```env
AI_PROVIDER="gemini"

GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.0-flash"

GROQ_API_KEY=""
GROQ_MODEL="llama-3.3-70b-versatile"

ANTHROPIC_API_KEY=""
ANTHROPIC_MODEL="claude-haiku-4-5-20251001"
```

For Gemini, create a key at **https://aistudio.google.com/app/apikey** and put
it into `GEMINI_API_KEY`. Gemini keys commonly start with `AIza`.

For Groq, create a key at **https://console.groq.com/keys** and put it into
`GROQ_API_KEY`. Groq keys commonly start with `gsk_`.

For Anthropic, create a key at **https://console.anthropic.com/** →
**Settings → API Keys** and put it into `ANTHROPIC_API_KEY`.

Restart the backend after changing `server/.env`.

If no key is set, the backend still starts, but AI chat returns a clear setup
error instead of crashing the app.

## Что именно делает backend

- **Авторизация**: регистрация и вход по email/паролю, обязательное
  подтверждение email 6-значным кодом, пароли хранятся захешированными
  (bcrypt), сессия — JWT-токен на 30 дней.
- **Все модули данных** (Цели, Привычки, Финансы, Здоровье, Заметки,
  Документы, Путешествия, Обучение, Покупки, Календарь, Подписки, Анализы,
  Погода) читаются и пишутся через универсальный REST API
  (`GET/POST /api/entities/:type`, `PATCH/DELETE /api/entities/:type/:id`),
  который использует общий React-контекст `src/store.tsx` — поэтому все
  основные экраны фронтенда продолжают работать без изменений в их коде.
- **Профиль** (имя, город) сохраняется через `PATCH /api/profile`.
- **AI-ассистент** — `POST /api/ai/chat`, реальные ответы от Claude с учётом
  контекста пользователя (город, активная цель).

## Известные ограничения (сознательно оставлено как есть)

- Лента "recentActivity" (последние действия) не сохраняется в базе — она
  сбрасывается при перезагрузке страницы, как и раньше в UI-логике.
- В Settings переключатели уведомлений остаются визуальными. Переключатели
  приватности AI подключены: backend не включает отключённые категории данных
  в snapshot для AI.
- Блокировка неудачных попыток входа хранится в памяти процесса. Она работает
  в одном запущенном экземпляре сервера; для нескольких инстансов Render её
  следует вынести в Redis/БД.
- Drag-and-drop календаря не реализован: перенос выполняется через модалку
  редактирования, которая сохраняет изменения в БД.

## Деплой бесплатно: Render + Neon + Vercel

SQLite — это файл внутри контейнера. На бесплатном Render он может исчезнуть
при перезапуске, поэтому production конфиг использует Neon Postgres.

1. Создайте бесплатную базу на [Neon](https://neon.tech): зарегистрируйтесь,
   нажмите **Create project**, скопируйте строку подключения из **Connect**.
2. Создайте аккаунт на [Resend](https://resend.com), откройте **API Keys**,
   создайте ключ и скопируйте `RESEND_API_KEY`. Для первого теста можно поставить
   `EMAIL_FROM=LifeOS <onboarding@resend.dev>`, для реальных пользователей лучше
   подключить свой домен в Resend.
3. На [Render](https://render.com) нажмите **New → Blueprint**, подключите
   GitHub-репозиторий и выберите `render.yaml`. Blueprint уже содержит:
   **Root Directory** `server`, **Build Command**
   `npm install && npm run db:push:prod && npm run build:prod`,
   **Start Command** `npm run start`.
4. В разделе **Environment** добавьте: `DATABASE_URL` (строка Neon),
   `JWT_SECRET` (результат команды выше), `RESEND_API_KEY`, `EMAIL_FROM`,
   `ANTHROPIC_API_KEY` (ключ из console.anthropic.com, можно оставить пустым),
   `ANTHROPIC_MODEL`, `PORT=8787` и пока `CORS_ORIGIN=http://localhost:3000`. Нажмите **Save
   Changes**, дождитесь deploy. Откройте `https://ВАШ-СЕРВИС.onrender.com/api/health`:
   ответ должен быть `{ "status": "ok" }`.
5. На [Vercel](https://vercel.com) выберите **Add New → Project**, импортируйте
   тот же репозиторий. Root Directory оставьте корнем проекта, Framework preset
   — Vite. В **Environment Variables** добавьте `VITE_API_URL` со значением
   `https://ВАШ-СЕРВИС.onrender.com/api`. Нажмите **Deploy**.
6. Скопируйте выданный Vercel домен. Вернитесь в Render → Environment и замените
   `CORS_ORIGIN` на этот адрес (без завершающего `/`), сохраните и дождитесь
   автоматического redeploy. Иначе браузер заблокирует API-запросы по CORS.

Финальная проверка деплоя: backend health-check отвечает → Vercel открывается
→ `CORS_ORIGIN` содержит фактический Vercel-домен → регистрация и вход
проходят именно на доменах production, не на localhost.

## Что было проверено

- `npm run lint`, `npm run build` и `npm --prefix server run build` завершились
  успешно 20 июля 2026.
- Сервер не удалось открыть в этой изолированной среде: среда запрещает слушать
  TCP-порты (`EPERM`), поэтому ручная browser-проверка и HTTP smoke-тест здесь
  не выполнялись. Их нужно выполнить локально командой `npm run dev`.
