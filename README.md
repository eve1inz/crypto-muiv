# Crypto Exchange Platform

## Описание

Crypto Exchange — это учебная платформа для обмена криптовалютами, реализованная на Flask (Python) с фронтендом на чистом JS/HTML/CSS. Проект поддерживает регистрацию, торговлю, кошельки, историю операций, уведомления, API-документацию (Swagger), нагрузочное тестирование (Locust) и покрытие тестами (pytest).

---

## Основные возможности

- Регистрация и аутентификация пользователей (JWT)
- Двухфакторная аутентификация (2FA)
- Управление кошельками (создание, пополнение, вывод)
- Торговля криптовалютами (создание/отмена ордеров, книга ордеров)
- Просмотр истории операций и баланса
- Уведомления о событиях
- Современный личный кабинет с графиком и рыночными данными
- REST API (Flask-RESTful)
- Swagger UI для документации API
- Нагрузочное тестирование (Locust)
- Покрытие тестами (pytest)

---

## Структура проекта

```
crypto_exchange-main/
├── app/                # Backend (Flask)
│   ├── api/            # REST API endpoints
│   ├── models/         # SQLAlchemy models
│   ├── services/       # Бизнес-логика
│   ├── utils/          # Вспомогательные функции
│   ├── static/         # Swagger спецификация
│   └── config.py       # Конфигурация
├── frontend/           # Фронтенд (HTML, CSS, JS)
│   ├── dashboard.html
│   ├── index.html
│   ├── css/
│   └── js/
├── run.py              # Точка входа (Flask)
├── requirements.txt    # Зависимости Python
├── locustfile.py       # Скрипт для нагрузочного тестирования
├── conftest.py         # Pytest фикстуры
└── README.md           # Документация (этот файл)
```

---

## Подробно про API

### Архитектура

- Все API доступны по префиксу `/api/v1/`.
- Реализовано на Flask-RESTful, маршруты регистрируются в `app/api/`.
- Авторизация через JWT (access/refresh токены).
- Документация OpenAPI (Swagger) доступна по `/api/docs`.

### Авторизация

- Регистрация: `POST /api/v1/auth/register` — создание пользователя.
- Вход: `POST /api/v1/auth/login` — получение access/refresh токенов.
- Для защищённых эндпоинтов требуется заголовок:
  ```
  Authorization: Bearer <access_token>
  ```

### Работа с кошельками

- Получить список кошельков:
  - `GET /api/v1/wallets`
- Создать кошелёк:
  - `POST /api/v1/wallets` с телом `{ "currency": "BTC" }`
- Пополнить кошелёк:
  - `POST /api/v1/wallets/<id>/deposit` с телом `{ "amount": 100.0 }`
- Вывести средства:
  - `POST /api/v1/wallets/<id>/withdraw` с телом `{ "amount": 10.0, "address": "..." }`
- Получить историю транзакций:
  - `GET /api/v1/wallets/<id>/transactions`

### Работа с ордерами

- Получить список ордеров:
  - `GET /api/v1/orders`
- Создать ордер:
  - `POST /api/v1/orders` с телом:
    ```json
    {
      "base_currency": "BTC",
      "quote_currency": "USDT",
      "type": "buy", // или "sell"
      "price": 20000.0,
      "amount": 0.05
    }
    ```
- Отменить ордер:
  - `DELETE /api/v1/orders/<id>`
- Книга ордеров:
  - `GET /api/v1/orderbook/BTC-USDT`

### Рыночные данные и ценники

- Получить текущий тикер:
  - `GET /api/v1/ticker/BTC-USDT`
  - Ответ: `{ "symbol": "BTC-USDT", "last_price": 20000.0, "24h_change": 1.5, "24h_volume": 123.45 }`
- Источник цен:
  - Для учебных целей цены генерируются или берутся из локального сервиса (см. `app/services/market_service.py`).
  - В реальном проекте можно подключить внешний API (например, Binance, CoinGecko) — структура кода позволяет это сделать.
  - Для графика истории цен используется эндпоинт `GET /api/v1/market-history/BTC-USDT?days=1`, который возвращает массив цен по времени (для построения графика на фронте).

### Уведомления

- Получить уведомления:
  - `GET /api/v1/notifications`
- Отметить как прочитанное:
  - `GET /api/v1/notifications/<id>`
- Отметить все как прочитанные:
  - `POST /api/v1/notifications/mark-all-read`

### Пример типового ответа (ордер)
```json
{
  "id": 123,
  "user_id": 1,
  "pair": "BTC/USDT",
  "type": "buy",
  "price": 20000.0,
  "amount": 0.05,
  "status": "pending",
  "created_at": "2025-05-20T12:00:00"
}
```

### Swagger/OpenAPI

- Вся спецификация API описана в `app/static/swagger.json`.
- Визуальная документация доступна по адресу http://localhost:5000/api/docs
- Можно тестировать запросы прямо из браузера.

---

## Как работает получение цен и графика

- Все рыночные данные (цены, история, объемы) возвращаются через сервис `MarketService` (`app/services/market_service.py`).
- Для демо-режима цены могут быть случайными или эмулируют реальное поведение рынка.
- Исторические данные для графика (цена по времени) возвращаются массивом точек:
  ```json
  [
    { "time": "12:00", "price": 20000.0 },
    { "time": "12:05", "price": 20010.0 },
    ...
  ]
  ```
- Если нужно подключить реальный источник (например, CoinGecko API), достаточно изменить реализацию в MarketService.

---

## Быстрый старт

### 1. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 2. Запуск сервера

```bash
python run.py
```

Сервер будет доступен на http://localhost:5000/

### 3. Открытие фронтенда

- Главная: http://localhost:5000/
- Личный кабинет: http://localhost:5000/dashboard

---

## Основные компоненты

### Backend (Flask)
- **app/__init__.py** — инициализация Flask, JWT, CORS, Swagger, Blueprints
- **app/api/** — все REST API endpoints (аутентификация, пользователи, кошельки, ордера, рынок, уведомления)
- **app/models/** — SQLAlchemy-модели: User, Wallet, Order, Transaction, Notification
- **app/services/** — бизнес-логика (работа с ордерами, рынком, уведомлениями)
- **app/utils/** — утилиты (валидация, безопасность)
- **app/static/swagger.json** — OpenAPI спецификация для Swagger UI

### Frontend
- **frontend/dashboard.html** — личный кабинет пользователя
- **frontend/index.html** — главная страница
- **frontend/js/dashboard.js** — логика личного кабинета (SPA)
- **frontend/css/dashboard.css** — стилизация интерфейса

### Тесты и нагрузка
- **conftest.py** — фикстуры для pytest
- **locustfile.py** — сценарии нагрузочного тестирования (Locust)

---

## API

- Все API доступны по префиксу `/api/v1/`
- Документация: http://localhost:5000/api/docs
- Примеры:
    - Регистрация: `POST /api/v1/auth/register`
    - Вход: `POST /api/v1/auth/login`
    - Кошельки: `GET /api/v1/wallets`, `POST /api/v1/wallets`
    - Ордера: `GET /api/v1/orders`, `POST /api/v1/orders`, `DELETE /api/v1/orders/<id>`
    - Рыночные данные: `GET /api/v1/ticker/<pair>`, `GET /api/v1/orderbook/<pair>`
    - История: `GET /api/v1/wallets/<id>/transactions`
    - Уведомления: `GET /api/v1/notifications`

---

## Тестирование

### Unit-тесты (pytest)

```bash
pytest
```

### Нагрузочное тестирование (Locust)

```bash
locust -f locustfile.py --host=http://localhost:5000
```

---

## Примечания

- Для работы требуется Python 3.10+
- Все данные хранятся в SQLite (по умолчанию)
- Swagger UI доступен по адресу `/api/docs`
- Для production рекомендуется использовать отдельную БД и переменные окружения

---

## Авторы и лицензия

- Автор: [Ваше Имя]
- Лицензия: MIT (или иная по вашему выбору)

---

## Контакты и поддержка

- Telegram: @yourusername
- Email: your@email.com
- Issues: через GitHub или напрямую
"# crypto-exchange-muiv" 
