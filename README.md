# Угадай факт - Онлайн игра

Мультиплеерная онлайн игра "Угадай факт" с использованием Socket.IO.

## Как играть

1. **Создайте игру** - получите уникальный код комнаты
2. **Поделитесь ссылкой** - отправьте код друзьям
3. **Ведущий настраивает** - выбирает тему и вводит факты
4. **Все угадывают** - одновременно пытаются угадать автора факта
5. **Смотрите результаты** - кто больше всех угадал

## Локальная разработка

### Установка зависимостей
```bash
npm install
```

### Запуск сервера
```bash
npm start
```

Или для разработки с автоперезагрузкой:
```bash
npm run dev
```

### Открыть игру
Перейдите по адресу: http://localhost:3000

## Деплой на Vercel

### 1. Создайте репозиторий на GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/guess-fact-online.git
git push -u origin main
```

### 2. Подключите к Vercel
1. Зайдите на [vercel.com](https://vercel.com)
2. Нажмите "New Project"
3. Подключите ваш GitHub репозиторий
4. Vercel автоматически определит настройки

### 3. Настройте переменные окружения (если нужно)
В Vercel Dashboard → Settings → Environment Variables

### 4. Получите URL
После деплоя получите URL вида: `https://your-project.vercel.app`

## Структура проекта

```
├── server.js              # Основной сервер
├── package.json           # Зависимости
├── calculator/
│   └── guess-the-fact-online.html  # Клиентская часть
└── README.md
```

## Технологии

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: HTML, CSS, JavaScript
- **Деплой**: Vercel

## Лицензия

MIT 