// dashboard.js - Функционал для страницы личного кабинета

// Убедимся, что API_BASE_URL определен глобально


document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
        // Сохраняем токены
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Очищаем URL от токенов
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        showToast('Успешная авторизация через Google!', 'success');
    }

    
    // Инициализация системы уведомлений
    initNotificationSystem();
    
    // Проверка авторизации перед загрузкой контента
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        // Если пользователь не авторизован, перенаправляем на главную
        window.location.href = 'index.html';
        return;
    }

    // Загрузка данных пользователя
    await loadUserData();
    
    // Загрузка уведомлений
    loadNotifications();
    
    // Настройка обработчиков уведомлений
    setupNotificationHandlers();

    // Настройка навигации по разделам
    setupNavigation();

    // Восстановление активной вкладки из localStorage
    const savedSection = localStorage.getItem('dashboardActiveSection');
    if (savedSection) {
        const navLink = document.querySelector(`[data-section="${savedSection}"]`);
        if (navLink) navLink.click();
    }

    // Инициализация каждого раздела
    initOverviewSection();
    initWalletsSection();
    initTradingSection();
    initOrdersSection();
    initHistorySection();
    initSettingsSection();

    // Настройка кнопки выхода
    document.getElementById('logout-btn').addEventListener('click', async function(e) {
        e.preventDefault();
        await logoutUser();
        window.location.href = 'index.html';
    });
    
    // Навигация по ссылкам между секциями
    document.querySelectorAll('.wallet-link, .history-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            const navLink = document.querySelector(`[data-section="${sectionId}-section"]`);
            if (navLink) {
                navLink.click();
            }
        });
    });
    // Автоматическая фильтрация по типу, кошельку и датам
const typeSelect = document.getElementById('history-type');
if (typeSelect) {
    typeSelect.addEventListener('change', loadTransactionHistory);
}
const walletSelect = document.getElementById('history-wallet');
if (walletSelect) {
    walletSelect.addEventListener('change', loadTransactionHistory);
}
const dateFromInput = document.getElementById('history-date-from');
if (dateFromInput) {
    dateFromInput.addEventListener('change', loadTransactionHistory);
}
const dateToInput = document.getElementById('history-date-to');
if (dateToInput) {
    dateToInput.addEventListener('change', loadTransactionHistory);
}

});

// Инициализация системы уведомлений
function initNotificationSystem() {
    // Создаем контейнер для toast-уведомлений, если его еще нет
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

// Функция для показа toast-уведомления
function showToast(message, type = 'info', duration = 3000) {
    // Проверяем, есть ли контейнер, если нет - создаем
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Иконка в зависимости от типа
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        case 'info':
        default:
            icon = '<i class="fas fa-info-circle"></i>';
            break;
    }
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Анимация появления
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Настройка закрытия
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        closeToast(toast);
    });
    
    // Автоматическое закрытие через duration мс
    if (duration > 0) {
        setTimeout(() => {
            closeToast(toast);
        }, duration);
    }
    
    return toast;
}


// Функция для закрытия toast-уведомления
function closeToast(toast) {
    toast.classList.remove('show');
    toast.classList.add('hide');
    
    // Удаляем элемент после завершения анимации
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// Проверка авторизации пользователя
// Проверка авторизации пользователя
// Проверка авторизации пользователя
async function checkAuthentication() {
    console.log('=== Проверка авторизации ===');
    
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('userData');
    
    console.log('Access token:', token ? 'Есть' : 'Нет');
    console.log('User data:', userData ? 'Есть' : 'Нет');
    
    if (!token) {
        console.log('Токен доступа отсутствует');
        return false;
    }

    try {
        // Пробуем получить данные пользователя для проверки валидности токена
        console.log('Проверяем валидность токена...');
        const userDataResponse = await fetchUserData();
        
        console.log('Ответ от fetchUserData:', userDataResponse);
        
        if (userDataResponse && (userDataResponse.id || userDataResponse.user_id)) {
            console.log('Авторизация успешна:', userDataResponse);
            return true;
        } else {
            console.log('Получены недействительные данные пользователя');
            return false;
        }
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        return false;
    }
}



// Загрузка данных пользователя
async function loadUserData() {
    try {
        const userData = await fetchUserData();
        if (userData) {
            // Обновляем имя пользователя в шапке
            document.getElementById('username').textContent = userData.username;
            
            // Сохраняем данные в локальном хранилище для дальнейшего использования
            localStorage.setItem('userData', JSON.stringify(userData));
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Ошибка загрузки данных пользователя', 'error');
    }
}

// Загрузка уведомлений пользователя
async function loadNotifications() {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications?unread=true`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });
        
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return loadNotifications();
            }
            return;
        }
        
        if (!response.ok) {
            throw new Error('Failed to load notifications');
        }
        
        const data = await response.json();
        const notificationList = document.getElementById('notification-list');
        const notificationCount = document.getElementById('notification-count');
        
        // Обновляем счетчик непрочитанных уведомлений
        const unreadCount = data.notifications.filter(n => !n.is_read).length;
        notificationCount.textContent = unreadCount;
        notificationCount.style.display = unreadCount > 0 ? 'block' : 'none';
        
        // Очищаем список
        notificationList.innerHTML = '';
        
        if (data.notifications.length === 0) {
            notificationList.innerHTML = '<div class="no-notifications">У вас нет новых уведомлений</div>';
            return;
        }
        
        // Заполняем список уведомлений
        data.notifications.forEach(notification => {
            const notificationItem = document.createElement('div');
            notificationItem.className = `notification-item ${notification.is_read ? 'read' : 'unread'}`;
            notificationItem.dataset.id = notification.id;
            
            // Определяем иконку в зависимости от типа уведомления
            let icon = '';
            switch (notification.type) {
                case 'order_update':
                    icon = '<i class="fas fa-exchange-alt"></i>';
                    break;
                case 'deposit':
                    icon = '<i class="fas fa-arrow-down"></i>';
                    break;
                case 'withdrawal':
                    icon = '<i class="fas fa-arrow-up"></i>';
                    break;
                case 'security':
                    icon = '<i class="fas fa-shield-alt"></i>';
                    break;
                default:
                    icon = '<i class="fas fa-bell"></i>';
            }
            
            // Форматируем дату
            const date = new Date(notification.created_at);
            const formattedDate = date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            notificationItem.innerHTML = `
                <div class="notification-icon">${icon}</div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${formattedDate}</div>
                </div>
            `;
            
            notificationList.appendChild(notificationItem);
            
            // Добавляем обработчик для отметки уведомления как прочитанное
            notificationItem.addEventListener('click', async function() {
                if (!notification.is_read) {
                    await markNotificationAsRead(notification.id);
                    this.classList.remove('unread');
                    this.classList.add('read');
                    
                    // Обновляем счетчик
                    const newCount = parseInt(notificationCount.textContent) - 1;
                    notificationCount.textContent = newCount;
                    notificationCount.style.display = newCount > 0 ? 'block' : 'none';
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Отметка уведомления как прочитанное
async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
            method: 'GET',  // API использует GET для отметки как прочитанное
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to mark notification as read');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return null;
    }
}

// Отметка всех уведомлений как прочитанные
async function markAllNotificationsAsRead() {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to mark all notifications as read');
        }
        
        // Обновляем UI
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
            item.classList.add('read');
        });
        
        const notificationCount = document.getElementById('notification-count');
        notificationCount.textContent = '0';
        notificationCount.style.display = 'none';
        
        return true;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        showToast('Ошибка при обновлении уведомлений', 'error');
        return false;
    }
}

// Настройка обработчиков уведомлений
function setupNotificationHandlers() {
    const notificationToggle = document.getElementById('notification-toggle');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const markAllReadBtn = document.getElementById('mark-all-read');
    
    // Открытие/закрытие выпадающего списка уведомлений
    notificationToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        notificationDropdown.classList.toggle('show');
    });
    
    // Закрытие выпадающего списка при клике вне его
    document.addEventListener('click', function(e) {
        if (!notificationDropdown.contains(e.target) && e.target !== notificationToggle) {
            notificationDropdown.classList.remove('show');
        }
    });
    
    // Кнопка "Прочитать все"
    markAllReadBtn.addEventListener('click', async function() {
        await markAllNotificationsAsRead();
    });
}

// Настройка навигации по разделам
function setupNavigation() {
    const navLinks = document.querySelectorAll('.dashboard-nav a');
    const sections = document.querySelectorAll('.dashboard-section');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Удаляем класс active у всех ссылок и секций
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Добавляем класс active для выбранной ссылки
            this.classList.add('active');
            
            // Показываем соответствующую секцию
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            
            // Сохраняем активную вкладку
            localStorage.setItem('dashboardActiveSection', sectionId);
        });
    });
}

// Инициализация раздела Обзор
// Инициализация раздела Обзор
async function initOverviewSection() {
    console.log('Инициализация раздела Обзор...');
    
    try {
        // Загрузка общего баланса
        if (document.getElementById('total-balance')) {
            await loadTotalBalance();
        } else {
            console.warn('Элемент total-balance не найден');
        }

        // Загрузка краткой информации о кошельках
        if (document.getElementById('wallet-summary-list')) {
            await loadWalletSummary();
        } else {
            console.warn('Элемент wallet-summary-list не найден');
        }

        // Загрузка недавней активности
        if (document.getElementById('recent-activity-list')) {
            await loadRecentActivity();
        } else {
            console.warn('Элемент recent-activity-list не найден');
        }

        // Загрузка обзора рынка
        if (document.getElementById('market-overview-data')) {
            await loadMarketOverview();
        } else {
            console.warn('Элемент market-overview-data не найден');
        }
        
        console.log('Раздел Обзор инициализирован успешно');
    } catch (error) {
        console.error('Ошибка при инициализации раздела Обзор:', error);
        showToast('Ошибка загрузки данных обзора', 'error');
    }
}


// Загрузка общего баланса
async function loadTotalBalance() {
    try {
        // Получение данных о кошельках
        const wallets = await fetchWallets();
        
        if (wallets.length === 0) {
            document.getElementById('total-balance').textContent = '0.00';
            document.getElementById('balance-change-percent').textContent = '0.00%';
            return;
        }
        
        // Загрузка текущих курсов для расчета общего баланса в USD
        let totalBalanceUSD = 0;
        
        for (const wallet of wallets) {
            let valueInUSD = 0;
            
            if (wallet.currency === 'USDT') {
                valueInUSD = wallet.balance;
            } else {
                // Получаем курс для пары [валюта]-USDT
                try {
                    const ticker = await fetchTicker(`${wallet.currency}-USDT`);
                    if (ticker) {
                        valueInUSD = wallet.balance * ticker.last_price;
                    }
                } catch (error) {
                    console.error(`Error fetching ticker for ${wallet.currency}:`, error);
                }
            }
            
            totalBalanceUSD += valueInUSD;
        }
        
        // Обновляем отображение баланса
        document.getElementById('total-balance').textContent = totalBalanceUSD.toFixed(2);
        
        // Для демонстрации изменения за 24ч можно использовать случайное значение
        // В реальном приложении это должно рассчитываться на основе исторических данных
        const changePercent = ((Math.random() * 10) - 5).toFixed(2);
        const changeElement = document.getElementById('balance-change-percent');
        changeElement.textContent = `${changePercent}%`;
        changeElement.classList.add(changePercent >= 0 ? 'price-up' : 'price-down');
        
    } catch (error) {
        console.error('Error loading total balance:', error);
        document.getElementById('total-balance').textContent = 'Ошибка загрузки';
        showToast('Ошибка загрузки общего баланса', 'error');
    }
}

// Загрузка краткой информации о кошельках
async function loadWalletSummary() {
    const container = document.getElementById('wallet-summary-list');
    
    try {
        const wallets = await fetchWallets();
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        if (wallets.length === 0) {
            container.innerHTML = '<p>У вас еще нет кошельков. Создайте свой первый кошелек.</p>';
            return;
        }
        
        // Отображаем до 3-х кошельков в обзоре
        const walletsToShow = wallets.slice(0, 3);
        
        for (const wallet of walletsToShow) {
            let valueInUSD = 0;
            
            if (wallet.currency === 'USDT') {
                valueInUSD = wallet.balance;
            } else {
                try {
                    const ticker = await fetchTicker(`${wallet.currency}-USDT`);
                    if (ticker) {
                        valueInUSD = wallet.balance * ticker.last_price;
                    }
                } catch (error) {
                    console.error(`Error fetching ticker for ${wallet.currency}:`, error);
                }
            }
            
            const walletItem = document.createElement('div');
            walletItem.className = 'wallet-item';
            walletItem.innerHTML = `
                <div class="wallet-icon">${wallet.currency}</div>
                <div class="wallet-info">
                    <div class="wallet-currency">${getCurrencyName(wallet.currency)}</div>
                    <div class="wallet-balance">
                        <span>${wallet.balance.toFixed(8)} ${wallet.currency}</span>
                        <span class="usd-value">≈ $${valueInUSD.toFixed(2)}</span>
                    </div>
                </div>
            `;
            
            container.appendChild(walletItem);
        }
        
        // Если есть больше кошельков, добавляем ссылку "смотреть все"
        if (wallets.length > 3) {
            const viewAllLink = document.createElement('a');
            viewAllLink.href = "#wallets";
            viewAllLink.className = "view-all-link wallet-link";
            viewAllLink.textContent = `Смотреть все (${wallets.length})`;
            container.appendChild(viewAllLink);
        }
        
    } catch (error) {
        console.error('Error loading wallet summary:', error);
        container.innerHTML = '<p>Ошибка загрузки данных кошельков</p>';
        showToast('Ошибка загрузки информации о кошельках', 'error');
    }
}

// Загрузка недавней активности
async function loadRecentActivity() {
    const container = document.getElementById('recent-activity-list');
    try {
        // Получаем последние ордеры
        const orders = await fetchOrders();
        // Очищаем контейнер
        container.innerHTML = '';
        if (orders.length === 0) {
            container.innerHTML = '<p>Нет недавней активности</p>';
            return;
        }
        // Отображаем до 5 последних операций
        const recentOrders = orders.slice(0, 5);
        for (const order of recentOrders) {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            let activityType, activityClass, icon;
            if (order.type === 'buy') {
                activityType = 'Покупка';
                activityClass = 'buy-activity';
                icon = 'arrow-down';
            } else if (order.type === 'sell') {
                activityType = 'Продажа';
                activityClass = 'sell-activity';
                icon = 'arrow-up';
            } else {
                activityType = order.type ? order.type.charAt(0).toUpperCase() + order.type.slice(1) : '—';
                activityClass = '';
                icon = 'exchange-alt';
            }
            const formattedDate = new Date(order.created_at).toLocaleString();
            // Получаем валюты из order.base_currency/order.quote_currency или парсим из order.pair
            let baseCurrency = order.base_currency, quoteCurrency = order.quote_currency;
            if ((!baseCurrency || !quoteCurrency) && order.pair && order.pair.includes('/')) {
                [baseCurrency, quoteCurrency] = order.pair.split('/');
            }
            activityItem.classList.add(activityClass);
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="activity-info">
                    <div class="activity-title">${activityType} ${order.amount} ${baseCurrency || ''}</div>
                    <div class="activity-time">${formattedDate}</div>
                </div>
                <div class="activity-value">
                    ${order.price} ${quoteCurrency || ''}
                </div>
            `;
            container.appendChild(activityItem);
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        container.innerHTML = '<p>Ошибка загрузки данных активности</p>';
        showToast('Ошибка загрузки недавней активности', 'error');
    }
}

// Загрузка обзора рынка
async function loadMarketOverview() {
    const tableBody = document.getElementById('market-overview-data');
    
    try {
        // Получаем данные тикеров для нескольких валютных пар
        const pairs = ['BTC-USDT', 'ETH-USDT', 'BNB-USDT', 'SOL-USDT', 'ADA-USDT'];
        
        // Создаем массив промисов для параллельной загрузки данных
        const tickerPromises = pairs.map(pair => fetchTicker(pair));
        const marketDataPromises = pairs.map(pair => fetchMarketData(pair));
        
        // Дожидаемся выполнения всех запросов
        let tickers = await Promise.all(tickerPromises);
        let marketData = await Promise.all(marketDataPromises);
        
        // Фильтруем null значения (в случае ошибок)
        tickers = tickers.filter(ticker => ticker !== null);
        marketData = marketData.filter(data => data !== null);
        
        // Если нет данных с API, показываем сообщение об ошибке
        if (tickers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">Ошибка загрузки данных рынка</td></tr>';
            return;
        }
        
        // Очищаем таблицу
        tableBody.innerHTML = '';
        
        // Заполняем таблицу данными
        tickers.forEach((ticker, index) => {
            const row = document.createElement('tr');
            
            // Добавляем проверку на undefined
            if (!ticker || !ticker.symbol) {
                console.warn('Invalid ticker data encountered, skipping...');
                return;
            }
            
            const symbol = ticker.symbol.split('-');
            
            // Безопасно получаем все значения с проверкой на undefined
            const lastPrice = (ticker.last_price !== undefined && ticker.last_price !== null) ? ticker.last_price : 0;
            const change24h = (ticker['24h_change'] !== undefined && ticker['24h_change'] !== null) ? ticker['24h_change'] : 0;
            
            // Безопасно получаем объем с учетом данных из marketData
            let volume = 0;
            if (marketData[index] && marketData[index]['24h_volume'] !== undefined && marketData[index]['24h_volume'] !== null) {
                volume = marketData[index]['24h_volume'];
            } else if (ticker['24h_volume'] !== undefined && ticker['24h_volume'] !== null) {
                volume = ticker['24h_volume'];
            } else {
                volume = Math.floor(Math.random() * 1000000);
            }
            
            row.innerHTML = `
                <td>${symbol[0]}/${symbol[1]}</td>
                <td>$${lastPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="${change24h >= 0 ? 'price-up' : 'price-down'}">
                    ${change24h > 0 ? '+' : ''}${change24h}%
                </td>
                <td>$${volume.toLocaleString()}</td>
                <td>
                    <a href="#trading" class="btn btn-sm btn-primary trade-btn" data-pair="${ticker.symbol}">
                        Торговать
                    </a>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Добавляем обработчики для кнопок торговли
        document.querySelectorAll('.trade-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Получаем валютную пару из атрибута
                const pair = this.getAttribute('data-pair');
                
                // Переключаемся на вкладку торговли
                document.querySelector('[data-section="trading-section"]').click();
                
                // Устанавливаем выбранную пару
                const marketPairSelect = document.getElementById('market-pair');
                if (marketPairSelect) {
                    marketPairSelect.value = pair;
                    marketPairSelect.dispatchEvent(new Event('change'));
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading market overview:', error);
        tableBody.innerHTML = '<tr><td colspan="5">Ошибка загрузки данных рынка</td></tr>';
        showToast('Ошибка загрузки обзора рынка', 'error');
    }
}


// Получение транзакций кошелька
async function fetchWalletTransactions(walletId, page = 1, perPage = 20) {
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            return { transactions: [], pagination: { total: 0, pages: 0 } };
        }
        
        const response = await fetch(`${API_BASE_URL}/wallets/${walletId}/transactions?page=${page}&per_page=${perPage}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Обработка истекшего токена
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return fetchWalletTransactions(walletId, page, perPage);
            }
            return { transactions: [], pagination: { total: 0, pages: 0 } };
        }
        
        // Обработка отсутствия доступа
        if (response.status === 403) {
            return { transactions: [], pagination: { total: 0, pages: 0 }, error: 'Access denied' };
        }
        
        if (!response.ok) {
            return { transactions: [], pagination: { total: 0, pages: 0 }, error: 'Failed to load transactions' };
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error fetching wallet transactions (ID: ${walletId}):`, error);
        return { transactions: [], pagination: { total: 0, pages: 0 }, error: error.message };
    }
}

// Инициализация раздела Кошельки
async function initWalletsSection() {
    await loadWallets();
    
    // Настройка модального окна для создания кошелька
    const createWalletBtn = document.getElementById('create-wallet-btn');
    const createWalletModal = document.getElementById('create-wallet-modal');
    const closeModalBtn = createWalletModal.querySelector('.close-modal');
    
    createWalletBtn.addEventListener('click', function() {
        createWalletModal.style.display = 'block';
    });
    
    closeModalBtn.addEventListener('click', function() {
        createWalletModal.style.display = 'none';
    });
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(e) {
        if (e.target === createWalletModal) {
            createWalletModal.style.display = 'none';
        }
    });
    
    // Настройка модального окна для пополнения/вывода
    const walletActionModal = document.getElementById('wallet-action-modal');
    const closeActionModalBtn = walletActionModal.querySelector('.close-modal');
    
    closeActionModalBtn.addEventListener('click', function() {
        walletActionModal.style.display = 'none';
    });
    
    // Закрытие модального окна действий при клике вне его
    window.addEventListener('click', function(e) {
        if (e.target === walletActionModal) {
            walletActionModal.style.display = 'none';
        }
    });
    
    // Обработка формы создания кошелька
    const createWalletForm = document.getElementById('create-wallet-form');
    createWalletForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const currencySelect = document.getElementById('wallet-currency');
        const currency = currencySelect.value;
        
        if (!currency) {
            showToast('Пожалуйста, выберите валюту', 'error');
            return;
        }
        
        try {
            const result = await createWallet(currency);
            
            if (result) {
                showToast(`Кошелек ${currency} успешно создан!`, 'success');
                createWalletModal.style.display = 'none';
                
                // Перезагружаем список кошельков
                await loadWallets();
                
                // Обновляем обзор кошельков на главной вкладке
                await loadWalletSummary();
                
                // Обновляем селектор кошельков в фильтре истории
                updateWalletSelector();
                
                // Сбрасываем форму
                createWalletForm.reset();
            } else {
                showToast('Ошибка при создании кошелька', 'error');
            }
        } catch (error) {
            showToast(`Ошибка: ${error.message}`, 'error');
        }
    });
    
    // Обработка формы пополнения/вывода
    const walletActionForm = document.getElementById('wallet-action-form');
    walletActionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const walletId = document.getElementById('action-wallet-id').value;
        const actionType = document.getElementById('action-type').value;
        const amount = parseFloat(document.getElementById('action-amount').value);
        
        if (isNaN(amount) || amount <= 0) {
            showToast('Пожалуйста, введите корректную сумму', 'error');
            return;
        }
        
        try {
            let result;
            
            if (actionType === 'deposit') {
                // Пополнение кошелька
                result = await walletDeposit(walletId, amount);
            } else if (actionType === 'withdraw') {
                // Вывод средств
                const address = document.getElementById('withdraw-address').value;
                if (!address) {
                    showToast('Пожалуйста, введите адрес для вывода', 'error');
                    return;
                }
                result = await walletWithdraw(walletId, amount, address);
            }
            
            if (result) {
                const actionText = actionType === 'deposit' ? 'пополнения' : 'вывода';
                showToast(`Операция ${actionText} успешно выполнена!`, 'success');
                walletActionModal.style.display = 'none';
                
                // Обновляем кошельки
                await loadWallets();
                await loadWalletSummary();
                
                // Обновляем историю операций если мы на вкладке истории
                if (document.getElementById('history-section').classList.contains('active')) {
                    await loadTransactionHistory();
                }
            } else {
                showToast('Ошибка при выполнении операции', 'error');
            }
        } catch (error) {
            showToast(`Ошибка: ${error.message}`, 'error');
        }
    });
    
    // Расчет комиссии и итоговой суммы при изменении суммы
    const actionAmount = document.getElementById('action-amount');
    actionAmount.addEventListener('input', function() {
        const amount = parseFloat(this.value) || 0;
        const actionType = document.getElementById('action-type').value;
        
        // Расчет комиссии (пример)
        let fee = 0;
        if (actionType === 'withdraw') {
            fee = amount * 0.001; // 0.1%
        }
        
        document.getElementById('action-fee').textContent = fee.toFixed(8);
        
        // Расчет итоговой суммы
        const total = actionType === 'deposit' ? amount : amount + fee;
        document.getElementById('action-total').textContent = total.toFixed(8);
    });
}

// Функция для вызова API пополнения кошелька
async function walletDeposit(walletId, amount) {
    try {
        const response = await fetch(`${API_BASE_URL}/wallets/${walletId}/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ amount })
        });
        
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return walletDeposit(walletId, amount);
            }
            return null;
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка при пополнении кошелька');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error making deposit:', error);
        throw error;
    }
}

// Функция для вызова API вывода средств
async function walletWithdraw(walletId, amount, address) {
    try {
        const response = await fetch(`${API_BASE_URL}/wallets/${walletId}/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ amount, address })
        });
        
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return walletWithdraw(walletId, amount, address);
            }
            return null;
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка при выводе средств');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error making withdrawal:', error);
        throw error;
    }
}

// Загрузка списка кошельков
async function loadWallets() {
    const container = document.getElementById('wallets-container');
    
    try {
        const wallets = await fetchWallets();
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        if (wallets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-wallet"></i>
                    </div>
                    <h3>У вас еще нет кошельков</h3>
                    <p>Создайте свой первый криптовалютный кошелек, чтобы начать торговлю</p>
                    <button id="create-first-wallet" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Создать кошелек
                    </button>
                </div>
            `;
            
            // Добавляем обработчик для кнопки создания первого кошелька
            document.getElementById('create-first-wallet').addEventListener('click', function() {
                document.getElementById('create-wallet-btn').click();
            });
            
            return;
        }
        
        // Отображаем все кошельки
        for (const wallet of wallets) {
            let valueInUSD = 0;
            
            if (wallet.currency === 'USDT') {
                valueInUSD = wallet.balance;
            } else {
                try {
                    const ticker = await fetchTicker(`${wallet.currency}-USDT`);
                    if (ticker) {
                        valueInUSD = wallet.balance * ticker.last_price;
                    }
                } catch (error) {
                    console.error(`Error fetching ticker for ${wallet.currency}:`, error);
                }
            }
            
            const walletCard = document.createElement('div');
            walletCard.className = 'wallet-card';
            walletCard.innerHTML = `
                <div class="wallet-card-header">
                    <div class="wallet-currency-icon">${wallet.currency}</div>
                    <div class="wallet-currency-name">${getCurrencyName(wallet.currency)}</div>
                    <div class="wallet-actions">
                        <button class="btn btn-sm btn-outline deposit-btn" data-wallet-id="${wallet.id}" data-currency="${wallet.currency}">
                            <i class="fas fa-arrow-down"></i> Пополнить
                        </button>
                        <button class="btn btn-sm btn-outline withdraw-btn" data-wallet-id="${wallet.id}" data-currency="${wallet.currency}">
                            <i class="fas fa-arrow-up"></i> Вывести
                        </button>
                    </div>
                </div>
                <div class="wallet-card-body">
                    <div class="wallet-balance">
                        <span class="balance-amount">${wallet.balance.toFixed(8)}</span>
                        <span class="balance-currency">${wallet.currency}</span>
                    </div>
                    <div class="wallet-usd-value">
                        ≈ $${valueInUSD.toFixed(2)}
                    </div>
                </div>
                <div class="wallet-card-footer">
                    <div class="wallet-address">
                        <span class="address-label">Адрес:</span>
                        <span class="address-value">${wallet.address.substring(0, 10)}...${wallet.address.substring(wallet.address.length - 10)}</span>
                        <button class="copy-address-btn" data-address="${wallet.address}">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <button class="btn btn-sm btn-primary trade-currency-btn" data-currency="${wallet.currency}">
                        <i class="fas fa-exchange-alt"></i> Торговать
                    </button>
                </div>
            `;
            
            container.appendChild(walletCard);
        }
        
        // Добавляем обработчики для кнопок
        
        // Копирование адреса
        document.querySelectorAll('.copy-address-btn').forEach(button => {
            button.addEventListener('click', function() {
                const address = this.getAttribute('data-address');
                
                // Копирование в буфер обмена
                navigator.clipboard.writeText(address).then(() => {
                    showToast('Адрес скопирован в буфер обмена', 'success');
                }).catch(err => {
                    console.error('Ошибка при копировании:', err);
                    showToast('Ошибка при копировании адреса', 'error');
                });
            });
        });
        
        // Торговля валютой
        document.querySelectorAll('.trade-currency-btn').forEach(button => {
            button.addEventListener('click', function() {
                const currency = this.getAttribute('data-currency');
                
                // Переключаемся на вкладку торговли
                document.querySelector('[data-section="trading-section"]').click();
                
                // Устанавливаем выбранную пару
                const marketPairSelect = document.getElementById('market-pair');
                if (marketPairSelect) {
                    // Ищем пару с выбранной валютой
                    const pairOption = Array.from(marketPairSelect.options).find(option => 
                        option.value.startsWith(`${currency}-`) || option.value.endsWith(`-${currency}`)
                    );
                    
                    if (pairOption) {
                        marketPairSelect.value = pairOption.value;
                        marketPairSelect.dispatchEvent(new Event('change'));
                    }
                }
            });
        });
        
        // Пополнение кошелька
        document.querySelectorAll('.deposit-btn').forEach(button => {
            button.addEventListener('click', function() {
                const walletId = this.getAttribute('data-wallet-id');
                const currency = this.getAttribute('data-currency');
                
                // Настраиваем модальное окно для пополнения
                document.getElementById('wallet-action-title').textContent = `Пополнение ${currency}`;
                document.getElementById('action-wallet-id').value = walletId;
                document.getElementById('action-type').value = 'deposit';
                document.getElementById('action-currency').textContent = currency;
                document.getElementById('action-fee-currency').textContent = currency;
                document.getElementById('action-total-currency').textContent = currency;
                
                // Сбрасываем и скрываем поле адреса
                document.getElementById('withdraw-address-group').style.display = 'none';
                
                // Сбрасываем значения
                document.getElementById('action-amount').value = '';
                document.getElementById('action-fee').textContent = '0.00';
                document.getElementById('action-total').textContent = '0.00';
                
                // Изменяем текст кнопки
                document.getElementById('wallet-action-submit').textContent = 'Пополнить';
                
                // Показываем модальное окно
                document.getElementById('wallet-action-modal').style.display = 'block';
            });
        });
        
        // Вывод средств
        document.querySelectorAll('.withdraw-btn').forEach(button => {
            button.addEventListener('click', function() {
                const walletId = this.getAttribute('data-wallet-id');
                const currency = this.getAttribute('data-currency');
                
                // Настраиваем модальное окно для вывода
                document.getElementById('wallet-action-title').textContent = `Вывод ${currency}`;
                document.getElementById('action-wallet-id').value = walletId;
                document.getElementById('action-type').value = 'withdraw';
                document.getElementById('action-currency').textContent = currency;
                document.getElementById('action-fee-currency').textContent = currency;
                document.getElementById('action-total-currency').textContent = currency;
                
                // Показываем поле адреса
                document.getElementById('withdraw-address-group').style.display = 'block';
                document.getElementById('withdraw-address').value = '';
                
                // Сбрасываем значения
                document.getElementById('action-amount').value = '';
                document.getElementById('action-fee').textContent = '0.00';
                document.getElementById('action-total').textContent = '0.00';
                
                // Изменяем текст кнопки
                document.getElementById('wallet-action-submit').textContent = 'Вывести';
                
                // Показываем модальное окно
                document.getElementById('wallet-action-modal').style.display = 'block';
            });
        });
        
    } catch (error) {
        console.error('Error loading wallets:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Ошибка загрузки кошельков</h3>
                <p>${error.message}</p>
                <button id="retry-load-wallets" class="btn btn-primary">
                    <i class="fas fa-sync"></i> Повторить
                </button>
            </div>
        `;
        
        // Добавляем обработчик для кнопки повтора загрузки
        document.getElementById('retry-load-wallets').addEventListener('click', function() {
            loadWallets();
        });
        
        showToast('Ошибка загрузки списка кошельков', 'error');
    }
}

// Инициализация раздела Торговли
async function initTradingSection() {
    setupTabs();
    setupOrderForm();
    await initOrderBook();
    initPriceChart();
    const marketPairSelect = document.getElementById('market-pair');
    let orderBookInterval = null;
    if (marketPairSelect) {
        marketPairSelect.addEventListener('change', async function() {
            const pair = this.value;
            const [baseCurrency, quoteCurrency] = pair.split('-');
            document.getElementById('chart-pair').textContent = pair.replace('-', '/');
            document.getElementById('buy-currency').textContent = baseCurrency;
            document.getElementById('buy-price-currency').textContent = quoteCurrency;
            document.getElementById('buy-total-currency').textContent = quoteCurrency;
            document.getElementById('buy-btn-currency').textContent = baseCurrency;
            document.getElementById('sell-currency').textContent = baseCurrency;
            document.getElementById('sell-price-currency').textContent = quoteCurrency;
            document.getElementById('sell-total-currency').textContent = quoteCurrency;
            document.getElementById('sell-btn-currency').textContent = baseCurrency;
            await updateOrderBook(pair, true);
            updatePriceChart(pair);
            await updateOrderFormPrices(pair);
            // Сбросить старый интервал
            if (orderBookInterval) clearInterval(orderBookInterval);
            // Обновлять только если раздел торговли активен
            orderBookInterval = setInterval(() => {
                if (document.getElementById('trading-section').classList.contains('active')) {
                    updateOrderBook(pair);
                }
            }, 15000); // 15 секунд
        });
        // Инициируем событие изменения для загрузки начальных данных
        marketPairSelect.dispatchEvent(new Event('change'));
    }
}

let priceChart = null;

function initPriceChart() {
    const chartContainer = document.getElementById('price-chart');
    if (!chartContainer) return;
    chartContainer.innerHTML = '<canvas id="priceChartCanvas"></canvas>';
    const ctx = document.getElementById('priceChartCanvas').getContext('2d');
    // Градиент для заливки
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0,144,255,0.25)');
    gradient.addColorStop(1, 'rgba(0,144,255,0.01)');
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '',
                data: [],
                borderColor: '#0090ff',
                backgroundColor: gradient,
                fill: true,
                pointRadius: 0,
                borderWidth: 3,
                tension: 0.35,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#0090ff',
                pointHoverBorderWidth: 2,
                shadowOffsetX: 0,
                shadowOffsetY: 4,
                shadowBlur: 12,
                shadowColor: 'rgba(0,144,255,0.15)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: '#222',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#0090ff',
                    borderWidth: 1,
                    padding: 12,
                    caretSize: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Цена: $${context.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                        }
                    }
                }
            },
            layout: { padding: 0 },
            scales: {
                x: {
                    display: true,
                    ticks: {
                        maxTicksLimit: 8,
                        autoSkip: true,
                        color: '#7bb6f0',
                        font: { size: 13, family: 'Inter, Arial, sans-serif' },
                        callback: function(value, index, values) {
                            // Ожидается формат "YYYY-MM-DD HH:MM" или "HH:MM"
                            const label = this.getLabelForValue(value);
                            if (label && label.length >= 5) {
                                // Если есть пробел, берем только время
                                if (label.includes(' ')) {
                                    return label.split(' ')[1];
                                }
                                // Если только время
                                return label;
                            }
                            return label;
                        }
                    },
                    grid: { display: false }
                },
                y: {
                    display: true,
                    ticks: {
                        color: '#7bb6f0',
                        font: { size: 13, family: 'Inter, Arial, sans-serif' },
                        callback: function(value) { return '$' + value; }
                    },
                    grid: { color: 'rgba(0,144,255,0.07)' }
                }
            },
            elements: {
                line: {
                    borderJoinStyle: 'round',
                    borderCapStyle: 'round',
                },
                point: {
                    radius: 0,
                    hoverRadius: 6,
                    backgroundColor: '#fff',
                    borderColor: '#0090ff',
                    borderWidth: 2
                }
            },
            animation: {
                duration: 900,
                easing: 'easeOutCubic'
            }
        }
    });
}


// Обновлять только данные, не пересоздавать canvas!
async function updatePriceChart(pair) {
    const chartContainer = document.getElementById('price-chart');
    if (!chartContainer) return;

    // НЕ пересоздавай canvas!
    if (!priceChart) {
        initPriceChart();
    }
    try {
        // Покажи "загрузка" только если график ещё пустой
        if (priceChart.data.labels.length === 0) {
            priceChart.data.labels = ['Загрузка...'];
            priceChart.data.datasets[0].data = [null];
            priceChart.update();
        }
        const response = await fetch(`${API_BASE_URL}/market-history/${pair}?days=1`);
        const result = await response.json();
        if (!response.ok || !result.history) throw new Error(result.error || 'Ошибка API');
        const labels = result.history.map(p => p.time);
        const data = result.history.map(p => p.price);

        priceChart.data.labels = labels;
        priceChart.data.datasets[0].data = data;
        priceChart.data.datasets[0].label = `Цена ${pair.replace('-', '/')}`;
        priceChart.update();
    } catch (e) {
        chartContainer.innerHTML = `<div class="chart-placeholder">
            <p>Ошибка загрузки графика</p>
            <p class="note">${e.message}</p>
        </div>`;
        priceChart = null; // сбрось ссылку, чтобы при следующем вызове создать новый canvas
    }
}


// Обновление цен в формах заказа
async function updateOrderFormPrices(pair) {
    try {
        const ticker = await fetchTicker(pair);
        
        if (ticker && ticker.last_price !== undefined) {
            const buyPrice = document.getElementById('buy-price');
            const sellPrice = document.getElementById('sell-price');
            
            if (buyPrice) {
                buyPrice.value = ticker.last_price.toFixed(2);
                // Вызываем событие input для расчета итоговой суммы
                buyPrice.dispatchEvent(new Event('input'));
            }
            
            if (sellPrice) {
                sellPrice.value = ticker.last_price.toFixed(2);
                // Вызываем событие input для расчета итоговой суммы
                sellPrice.dispatchEvent(new Event('input'));
            }
        } else {
            // Используем дефолтное значение, если данные не удалось получить
            const defaultPrice = "1000.00";
            
            const buyPrice = document.getElementById('buy-price');
            const sellPrice = document.getElementById('sell-price');
            
            if (buyPrice && buyPrice.value === "") {
                buyPrice.value = defaultPrice;
                buyPrice.dispatchEvent(new Event('input'));
            }
            
            if (sellPrice && sellPrice.value === "") {
                sellPrice.value = defaultPrice;
                sellPrice.dispatchEvent(new Event('input'));
            }
        }
    } catch (error) {
        console.error('Error updating form prices:', error);
        showToast('Ошибка обновления цен', 'error');
    }
}

// Обновление ордербука для выбранной пары с кэшированием
async function updateOrderBook(pair, force = false) {
    const sellOrdersContainer = document.querySelector('.sell-orders');
    const buyOrdersContainer = document.querySelector('.buy-orders');
    const currentPriceElement = document.querySelector('.current-price');
    if (!sellOrdersContainer || !buyOrdersContainer || !currentPriceElement) return;

    // Ключ для кэша
    const cacheKey = `orderbook_${pair}`;
    const cacheTTL = 15 * 1000; // 15 секунд
    let cached = null;
    try {
        cached = JSON.parse(localStorage.getItem(cacheKey));
    } catch {}
    const now = Date.now();

    // Если есть кэш и он свежий, показываем его сразу
    if (cached && now - cached.ts < cacheTTL && !force) {
        populateOrderBook(sellOrdersContainer, cached.data.asks, 'sell');
        populateOrderBook(buyOrdersContainer, cached.data.bids, 'buy');
        if (cached.data.bids.length > 0 && cached.data.asks.length > 0) {
            const highestBid = cached.data.bids[0].price;
            const lowestAsk = cached.data.asks[0].price;
            const midPrice = (highestBid + lowestAsk) / 2;
            currentPriceElement.textContent = `$${midPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
    } else {
        // Показываем индикатор загрузки
        sellOrdersContainer.innerHTML = '<div class="loading-spinner">Загрузка...</div>';
        buyOrdersContainer.innerHTML = '<div class="loading-spinner">Загрузка...</div>';
    }

    // Всегда пробуем обновить с сервера, если force=true или кэш устарел
    if (!cached || now - (cached?.ts || 0) >= cacheTTL || force) {
        try {
            const orderBookData = await fetchOrderBook(pair);
            if (!orderBookData || !orderBookData.bids || !orderBookData.asks) {
                sellOrdersContainer.innerHTML = '<div class="error-message">Ошибка загрузки ордербука</div>';
                buyOrdersContainer.innerHTML = '<div class="error-message">Ошибка загрузки ордербука</div>';
                showToast('Ошибка загрузки книги ордеров', 'error');
                return;
            }
            // Кэшируем
            localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: orderBookData }));
            // Показываем данные
            populateOrderBook(sellOrdersContainer, orderBookData.asks, 'sell');
            populateOrderBook(buyOrdersContainer, orderBookData.bids, 'buy');
            if (orderBookData.bids.length > 0 && orderBookData.asks.length > 0) {
                const highestBid = orderBookData.bids[0].price;
                const lowestAsk = orderBookData.asks[0].price;
                const midPrice = (highestBid + lowestAsk) / 2;
                currentPriceElement.textContent = `$${midPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            }
        } catch (error) {
            console.error('Error updating order book:', error);
            sellOrdersContainer.innerHTML = '<div class="error-message">Ошибка загрузки ордербука</div>';
            buyOrdersContainer.innerHTML = '<div class="error-message">Ошибка загрузки ордербука</div>';
            showToast('Ошибка загрузки книги ордеров', 'error');
        }
    }
}

// Настройка переключения вкладок
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Удаляем активный класс со всех кнопок и содержимого
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Добавляем активный класс на нажатую кнопку и соответствующее содержимое
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }
        });
    });
}

// Настройка формы ордера
function setupOrderForm() {
    // Расчеты для формы покупки
    const buyAmount = document.getElementById('buy-amount');
    const buyPrice = document.getElementById('buy-price');
    const buyTotal = document.getElementById('buy-total');
    
    if (buyAmount && buyPrice && buyTotal) {
        function calculateBuyTotal() {
            if (buyAmount.value && buyPrice.value) {
                const total = parseFloat(buyAmount.value) * parseFloat(buyPrice.value);
                buyTotal.value = total.toFixed(2);
            } else {
                buyTotal.value = '';
            }
        }
        
        buyAmount.addEventListener('input', calculateBuyTotal);
        buyPrice.addEventListener('input', calculateBuyTotal);
    }
    
    // Расчеты для формы продажи
    const sellAmount = document.getElementById('sell-amount');
    const sellPrice = document.getElementById('sell-price');
    const sellTotal = document.getElementById('sell-total');
    
    if (sellAmount && sellPrice && sellTotal) {
        function calculateSellTotal() {
            if (sellAmount.value && sellPrice.value) {
                const total = parseFloat(sellAmount.value) * parseFloat(sellPrice.value);
                sellTotal.value = total.toFixed(2);
            } else {
                sellTotal.value = '';
            }
        }
        
        sellAmount.addEventListener('input', calculateSellTotal);
        sellPrice.addEventListener('input', calculateSellTotal);
    }
    
    // Обработка отправки формы покупки
    const buyForm = document.getElementById('buy-form');
    if (buyForm) {
        buyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Проверка авторизации
            if (!localStorage.getItem('accessToken')) {
                showToast('Для совершения торговых операций необходимо войти в систему', 'error');
                return;
            }
            
            if (!buyAmount.value || !buyPrice.value) {
                showToast('Пожалуйста, заполните все поля', 'error');
                return;
            }
            
            const marketPair = document.getElementById('market-pair').value;
            const [baseCurrency, quoteCurrency] = marketPair.split('-');
            
            const orderData = {
                base_currency: baseCurrency,
                quote_currency: quoteCurrency,
                type: 'buy',
                amount: parseFloat(buyAmount.value),
                price: parseFloat(buyPrice.value)
            };
            
            try {
                const result = await createOrder(orderData);
                
                if (result) {
                    showToast('Ордер на покупку успешно создан!', 'success');
                    buyForm.reset();
                    
                    // Обновляем цену в форме
                    const ticker = await fetchTicker(marketPair);
                    if (ticker) {
                        buyPrice.value = ticker.last_price.toFixed(2);
                    }
                    
                    // Обновляем ордербук
                    await updateOrderBook(marketPair);
                    
                    // Обновляем список ордеров, если мы на вкладке ордеров
                    if (document.getElementById('orders-section').classList.contains('active')) {
                        await loadOrders();
                    }
                } else {
                    showToast('Ошибка при создании ордера', 'error');
                }
            } catch (error) {
                showToast(`Ошибка: ${error.message}`, 'error');
            }
        });
    }
    
    // Обработка отправки формы продажи
    const sellForm = document.getElementById('sell-form');
    if (sellForm) {
        sellForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Проверка авторизации
            if (!localStorage.getItem('accessToken')) {
                showToast('Для совершения торговых операций необходимо войти в систему', 'error');
                return;
            }
            
            if (!sellAmount.value || !sellPrice.value) {
                showToast('Пожалуйста, заполните все поля', 'error');
                return;
            }
            
            const marketPair = document.getElementById('market-pair').value;
            const [baseCurrency, quoteCurrency] = marketPair.split('-');
            
            const orderData = {
                base_currency: baseCurrency,
                quote_currency: quoteCurrency,
                type: 'sell',
                amount: parseFloat(sellAmount.value),
                price: parseFloat(sellPrice.value)
            };
            
            try {
                const result = await createOrder(orderData);
                
                if (result) {
                    showToast('Ордер на продажу успешно создан!', 'success');
                    sellForm.reset();
                    
                    // Обновляем цену в форме
                    const ticker = await fetchTicker(marketPair);
                    if (ticker) {
                        sellPrice.value = ticker.last_price.toFixed(2);
                    }
                    
                    // Обновляем ордербук
                    await updateOrderBook(marketPair);
                    
                    // Обновляем список ордеров, если мы на вкладке ордеров
                    if (document.getElementById('orders-section').classList.contains('active')) {
                        await loadOrders();
                    }
                } else {
                    showToast('Ошибка при создании ордера', 'error');
                }
            } catch (error) {
                showToast(`Ошибка: ${error.message}`, 'error');
            }
        });
    }
}

// Заполнение ордербука данными
function populateOrderBook(container, orders, type) {
    if (!container || !orders) return;
    
    container.innerHTML = '';
    
    orders.forEach(order => {
        const orderRow = document.createElement('div');
        orderRow.className = 'order-row';
        
        const total = order.price * order.amount;
        
        orderRow.innerHTML = `
            <div>${order.price.toFixed(2)}</div>
            <div>${order.amount.toFixed(3)}</div>
            <div>${total.toFixed(2)}</div>
        `;
        
        // Добавляем класс для стилизации в зависимости от типа ордера
        orderRow.classList.add(type === 'sell' ? 'sell-order' : 'buy-order');
        
        // Добавляем визуальный индикатор объема
        const volume = Math.min(100, Math.max(5, (order.amount / orders[0].amount) * 100));
        orderRow.style.background = type === 'sell' 
            ? `linear-gradient(to left, rgba(239, 68, 68, 0.1) ${volume}%, transparent ${volume}%)`
            : `linear-gradient(to left, rgba(16, 185, 129, 0.1) ${volume}%, transparent ${volume}%)`;
        
        container.appendChild(orderRow);
    });
}

// Инициализация раздела Ордеров
async function initOrdersSection() {
    // Настройка переключения вкладок с ордерами
    const orderTabButtons = document.querySelectorAll('.order-tab-btn');
    const orderTabContents = document.querySelectorAll('.orders-tab-content');
    
    orderTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Удаляем класс active со всех кнопок и содержимого
            orderTabButtons.forEach(btn => btn.classList.remove('active'));
            orderTabContents.forEach(content => content.classList.remove('active'));
            
            // Добавляем активный класс на нажатую кнопку и соответствующее содержимое
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }
        });
    });
    
    // Загрузка ордеров
    await loadOrders();
}

// Загрузка ордеров пользователя
async function loadOrders() {
    const activeOrdersTable = document.getElementById('active-orders-data');
    const completedOrdersTable = document.getElementById('completed-orders-data');
    const cancelledOrdersTable = document.getElementById('cancelled-orders-data');
    
    if (!activeOrdersTable || !completedOrdersTable || !cancelledOrdersTable) return;
    
    try {
        // Показываем индикатор загрузки
        activeOrdersTable.innerHTML = '<tr><td colspan="8">Загрузка ордеров...</td></tr>';
        completedOrdersTable.innerHTML = '<tr><td colspan="7">Загрузка ордеров...</td></tr>';
        cancelledOrdersTable.innerHTML = '<tr><td colspan="7">Загрузка ордеров...</td></tr>';
        
        // Получаем все ордеры
        const orders = await fetchOrders();
        
        // Если ордеров нет, показываем соответствующее сообщение
        if (orders.length === 0) {
            activeOrdersTable.innerHTML = '<tr><td colspan="8">У вас нет активных ордеров</td></tr>';
            completedOrdersTable.innerHTML = '<tr><td colspan="7">У вас нет выполненных ордеров</td></tr>';
            cancelledOrdersTable.innerHTML = '<tr><td colspan="7">У вас нет отмененных ордеров</td></tr>';
            return;
        }

        // Разделяем ордеры по статусам
        const activeOrders = orders.filter(order =>
            order.status === 'pending' || order.status === 'partially_filled'
        );

        const completedOrders = orders.filter(order => order.status === 'filled');
        const cancelledOrders = orders.filter(order => order.status === 'cancelled');

        // Заполняем таблицы данными
        activeOrdersTable.innerHTML = fillOrdersTable(activeOrders, true);
        completedOrdersTable.innerHTML = fillOrdersTable(completedOrders);
        cancelledOrdersTable.innerHTML = fillOrdersTable(cancelledOrders);

        // Добавляем обработчики для кнопок отмены ордеров
        document.querySelectorAll('.cancel-order-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const orderId = this.getAttribute('data-order-id');

                if (confirm('Вы уверены, что хотите отменить этот ордер?')) {
                    try {
                        const result = await cancelOrder(orderId);

                        if (result) {
                            showToast('Ордер успешно отменен', 'success');
                            // Перезагружаем ордеры
                            await loadOrders();
                        } else {
                            showToast('Ошибка при отмене ордера', 'error');
                        }
                    } catch (error) {
                        showToast(`Ошибка: ${error.message}`, 'error');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        activeOrdersTable.innerHTML = '<tr><td colspan="8">Ошибка загрузки ордеров</td></tr>';
        completedOrdersTable.innerHTML = '<tr><td colspan="7">Ошибка загрузки ордеров</td></tr>';
        cancelledOrdersTable.innerHTML = '<tr><td colspan="7">Ошибка загрузки ордеров</td></tr>';
        showToast('Ошибка загрузки ордеров', 'error');
    }
}

// Заполнение таблицы ордеров
function fillOrdersTable(orders, includeActions = false) {
    let html = '';
    orders.forEach(order => {
        // Парсим валюты из строки pair
        let base_currency = '', quote_currency = '';
        if (order.pair && order.pair.includes('/')) {
            [base_currency, quote_currency] = order.pair.split('/');
        } else {
            // fallback если вдруг нет pair
            base_currency = order.base_currency || '';
            quote_currency = order.quote_currency || '';
        }

        const formattedDate = new Date(order.created_at).toLocaleString();
        const type = order.type === 'buy' ? 'Покупка' : 'Продажа';
        const typeClass = order.type === 'buy' ? 'buy-type' : 'sell-type';
        const total = order.price * order.amount;

        let statusText, statusClass;
        switch(order.status) {
            case 'pending':
                statusText = 'В ожидании';
                statusClass = 'status-pending';
                break;
            case 'partial':
            case 'partially_filled':
                statusText = 'Частично исполнен';
                statusClass = 'status-partial';
                break;
            case 'filled':
                statusText = 'Исполнен';
                statusClass = 'status-filled';
                break;
            case 'cancelled':
                statusText = 'Отменён';
                statusClass = 'status-cancelled';
                break;
            default:
                statusText = order.status;
                statusClass = '';
        }

        html += `
            <tr>
                <td>${formattedDate}</td>
                <td>${order.pair}</td>
                <td class="${typeClass}">${type}</td>
                <td>${order.price.toFixed(2)} ${quote_currency}</td>
                <td>${order.amount.toFixed(8)} ${base_currency}</td>
                <td>${total.toFixed(2)} ${quote_currency}</td>
                <td class="${statusClass}">${statusText}</td>
                ${includeActions ? `
                    <td>
                        <button class="btn btn-sm btn-danger cancel-order-btn" data-order-id="${order.id}">
                            Отменить
                        </button>
                    </td>
                ` : ''}
            </tr>
        `;
    });

    return html;
}


// Инициализация раздела Истории операций
async function initHistorySection() {
    // Заполняем селектор кошельков
    await updateWalletSelector();
    
    // Настройка фильтров истории
    const filterButton = document.getElementById('history-filter-btn');
    
    if (filterButton) {
        filterButton.addEventListener('click', function() {
            loadTransactionHistory();
        });
    }
    
    // Загрузка истории транзакций
    await loadTransactionHistory();
}

// Обновление селектора кошельков для фильтра истории
async function updateWalletSelector() {
    const walletSelector = document.getElementById('history-wallet');
    if (!walletSelector) return;
    
    try {
        const wallets = await fetchWallets();
        
        // Сохраняем текущее выбранное значение
        const currentValue = walletSelector.value;
        
        // Очищаем селектор, оставляя только опцию "Все кошельки"
        while (walletSelector.options.length > 1) {
            walletSelector.remove(1);
        }
        
        // Добавляем опции для каждого кошелька
        wallets.forEach(wallet => {
            const option = document.createElement('option');
            option.value = wallet.id;
            option.textContent = `${getCurrencyName(wallet.currency)} (${wallet.currency})`;
            walletSelector.appendChild(option);
        });
        
        // Восстанавливаем выбранное значение, если оно существует
        if (currentValue && walletSelector.querySelector(`option[value="${currentValue}"]`)) {
            walletSelector.value = currentValue;
        }
    } catch (error) {
        console.error('Error updating wallet selector:', error);
    }
}

// Загрузка истории транзакций
async function loadTransactionHistory() {
    const historyTable = document.getElementById('history-data');
    
    if (!historyTable) return;
    
    try {
        // Получаем значения фильтров
        const transactionType = document.getElementById('history-type').value;
        const walletId = document.getElementById('history-wallet').value;
        const dateFrom = document.getElementById('history-date-from').value;
        const dateTo = document.getElementById('history-date-to').value;
        
        // Показываем индикатор загрузки
        historyTable.innerHTML = '<tr><td colspan="7">Загрузка истории операций...</td></tr>';
        
        // Формируем параметры запроса
        let queryParams = '';
        
        if (transactionType && transactionType !== 'all') {
            queryParams += `&type=${transactionType}`;
        }
        
        if (dateFrom) {
            queryParams += `&date_from=${dateFrom}`;
        }
        
        if (dateTo) {
            queryParams += `&date_to=${dateTo}`;
        }
        
        // Если выбран конкретный кошелек, загружаем его транзакции
        if (walletId && walletId !== 'all') {
            try {
                const response = await fetch(`${API_BASE_URL}/wallets/${walletId}/transactions?page=1&per_page=50${queryParams}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });
                
                if (response.status === 401) {
                    const refreshed = await refreshToken();
                    if (refreshed) {
                        return loadTransactionHistory();
                    }
                    return;
                }
                
                // Обрабатываем ошибку доступа
                if (response.status === 403) {
                    historyTable.innerHTML = '<tr><td colspan="7">Нет доступа к этому кошельку</td></tr>';
                    return;
                }
                
                if (!response.ok) {
                    throw new Error('Failed to fetch transaction history');
                }
                
                const data = await response.json();
                
                // Заполняем таблицу транзакциями
                if (data.transactions.length === 0) {
                    historyTable.innerHTML = '<tr><td colspan="7">Нет операций за выбранный период</td></tr>';
                    return;
                }
                
                historyTable.innerHTML = '';
                
                data.transactions.forEach(transaction => {
                    const row = createTransactionRow(transaction);
                    historyTable.appendChild(row);
                });
                
                return;
            } catch (error) {
                console.error('Error loading wallet transactions:', error);
                showToast('Ошибка загрузки истории транзакций', 'error');
                historyTable.innerHTML = '<tr><td colspan="7">Ошибка загрузки истории операций</td></tr>';
                return;
            }
        }
        
        // Если не выбран конкретный кошелек, загружаем транзакции
        // только для кошельков текущего пользователя
        try {
            const wallets = await fetchWallets();
            let allTransactions = [];
            
            // Если нет кошельков, показываем сообщение
            if (wallets.length === 0) {
                historyTable.innerHTML = '<tr><td colspan="7">У вас нет кошельков и операций</td></tr>';
                return;
            }
            
            // Для каждого кошелька получаем транзакции последовательно
            // вместо параллельного запроса всех кошельков
            for (const wallet of wallets) {
                try {
                    const response = await fetch(`${API_BASE_URL}/wallets/${wallet.id}/transactions?page=1&per_page=10${queryParams}`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                        }
                    });
                    
                    // Обработка истекшего токена
                    if (response.status === 401) {
                        const refreshed = await refreshToken();
                        if (!refreshed) break;
                        
                        // Повторяем текущую итерацию
                        const retryResponse = await fetch(`${API_BASE_URL}/wallets/${wallet.id}/transactions?page=1&per_page=10${queryParams}`, {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                            }
                        });
                        
                        if (!retryResponse.ok) continue;
                        
                        const data = await retryResponse.json();
                        
                        // Добавляем информацию о валюте к транзакциям
                        data.transactions.forEach(tx => {
                            tx.currency = wallet.currency;
                            tx.wallet_id = wallet.id;
                        });
                        
                        allTransactions.push(...data.transactions);
                        continue;
                    }
                    
                    // Пропускаем кошельки, к которым нет доступа
                    if (response.status === 403) {
                        // Тихо пропускаем, чтобы не засорять консоль
                        continue;
                    }
                    
                    if (!response.ok) {
                        continue;
                    }
                    
                    const data = await response.json();
                    
                    // Добавляем информацию о валюте к транзакциям
                    data.transactions.forEach(tx => {
                        tx.currency = wallet.currency;
                        tx.wallet_id = wallet.id;
                    });
                    
                    allTransactions.push(...data.transactions);
                } catch (error) {
                    // Тихо пропускаем ошибки для отдельных кошельков
                    continue;
                }
            }
            
            // Сортируем все транзакции по дате (новые сверху)
            allTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Заполняем таблицу транзакциями
            if (transactionType && transactionType !== 'all') {
                allTransactions = allTransactions.filter(tx => tx.type === transactionType);
            }
            
            historyTable.innerHTML = '';
            
            allTransactions.slice(0, 50).forEach(transaction => {
                const row = createTransactionRow(transaction);
                historyTable.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading all transactions:', error);
            showToast('Ошибка загрузки истории транзакций', 'error');
            historyTable.innerHTML = '<tr><td colspan="7">Ошибка загрузки истории операций</td></tr>';
        }
    } catch (error) {
        console.error('Error loading transaction history:', error);
        historyTable.innerHTML = '<tr><td colspan="7">Ошибка загрузки истории операций</td></tr>';
        showToast('Ошибка загрузки истории операций', 'error');
    }
}

// Создание строки таблицы для транзакции
function createTransactionRow(transaction) {
    const row = document.createElement('tr');
    
    const formattedDate = new Date(transaction.created_at).toLocaleString();
    let typeText, typeClass;
    
    switch(transaction.type) {
        case 'deposit':
            typeText = 'Пополнение';
            typeClass = 'type-deposit';
            break;
        case 'withdrawal':
            typeText = 'Вывод';
            typeClass = 'type-withdrawal';
            break;
        case 'trade':
            typeText = 'Сделка';
            typeClass = 'type-trade';
            break;
        default:
            typeText = transaction.type || '—';
            typeClass = '';
    }
    
    let statusText, statusClass;
    switch(transaction.status) {
        case 'completed':
            statusText = 'Завершено';
            statusClass = 'status-completed';
            break;
        case 'pending':
            statusText = 'В обработке';
            statusClass = 'status-pending';
            break;
        case 'failed':
            statusText = 'Ошибка';
            statusClass = 'status-failed';
            break;
        default:
            statusText = transaction.status;
            statusClass = '';
    }
    
    row.innerHTML = `
        <td>${formattedDate}</td>
        <td class="${typeClass}">${typeText}</td>
        <td>${transaction.currency || '-'}</td>
        <td>${parseFloat(transaction.amount).toFixed(8)} ${transaction.currency || ''}</td>
        <td>${parseFloat(transaction.fee || 0).toFixed(8)} ${transaction.currency || ''}</td>
        <td class="${statusClass}">${statusText}</td>
        <td>
            <button class="btn btn-sm btn-outline view-transaction-details" data-tx-id="${transaction.id}">
                Детали
            </button>
        </td>
    `;
    
    // Добавляем обработчик для кнопки просмотра деталей
    row.querySelector('.view-transaction-details').addEventListener('click', function() {
        showTransactionDetails(transaction);
    });
    
    return row;
}

// Показ модального окна с деталями транзакции
function showTransactionDetails(transaction) {
    // Получаем элементы модального окна
    const modal = document.getElementById('transaction-detail-modal');
    const modalContent = document.getElementById('transaction-detail-content');

    // Формируем читаемое название типа транзакции
    let typeText;
    switch (transaction.type) {
        case 'deposit':
            typeText = 'Пополнение';
            break;
        case 'withdrawal':
            typeText = 'Вывод';
            break;
        case 'trade':
            typeText = 'Сделка';
            break;
        default:
            typeText = transaction.type || '—';
    }

    // Форматируем дату
    const formattedDate = transaction.created_at
        ? new Date(transaction.created_at).toLocaleString()
        : '';

    // Формируем детали для показа
    let details = `
        <p><strong>ID:</strong> ${transaction.id}</p>
        <p><strong>Тип:</strong> ${typeText}</p>
        <p><strong>Валюта:</strong> ${transaction.currency || '-'}</p>
        <p><strong>Сумма:</strong> ${parseFloat(transaction.amount).toFixed(8)} ${transaction.currency || ''}</p>
        <p><strong>Комиссия:</strong> ${parseFloat(transaction.fee || 0).toFixed(8)} ${transaction.currency || ''}</p>
        <p><strong>Статус:</strong> ${transaction.status}</p>
        <p><strong>Дата:</strong> ${formattedDate}</p>
    `;

    if (transaction.tx_hash) {
        details += `<p><strong>Хеш транзакции:</strong> ${transaction.tx_hash}</p>`;
    }

    // Вставляем детали в модалку
    if (modalContent) {
        modalContent.innerHTML = details;
    }

    // Показываем модалку
    if (modal) {
        modal.style.display = 'block';
    }
}


// Закрытие модального окна
document.getElementById('transaction-detail-close').addEventListener('click', function() {
    document.getElementById('transaction-detail-modal').style.display = 'none';
});


// Показ модального окна с деталями транзакции
function showTransactionDetails(transaction) {
    // Получаем элементы модального окна
    const modal = document.getElementById('transaction-detail-modal');
    const modalContent = document.getElementById('transaction-detail-content');

    // Формируем читаемое название типа транзакции
    let typeText;
    switch (transaction.type) {
        case 'deposit':
            typeText = 'Пополнение';
            break;
        case 'withdrawal':
            typeText = 'Вывод';
            break;
        case 'trade':
            typeText = 'Сделка';
            break;
        default:
            typeText = transaction.type || '—';
    }

    // Форматируем дату
    const formattedDate = transaction.created_at
        ? new Date(transaction.created_at).toLocaleString()
        : '';

    // Формируем детали для показа
    let details = `
        <p><strong>ID:</strong> ${transaction.id}</p>
        <p><strong>Тип:</strong> ${typeText}</p>
        <p><strong>Валюта:</strong> ${transaction.currency || '-'}</p>
        <p><strong>Сумма:</strong> ${parseFloat(transaction.amount).toFixed(8)} ${transaction.currency || ''}</p>
        <p><strong>Комиссия:</strong> ${parseFloat(transaction.fee || 0).toFixed(8)} ${transaction.currency || ''}</p>
        <p><strong>Статус:</strong> ${transaction.status}</p>
        <p><strong>Дата:</strong> ${formattedDate}</p>
    `;

    if (transaction.tx_hash) {
        details += `<p><strong>Хеш транзакции:</strong> ${transaction.tx_hash}</p>`;
    }

    // Вставляем детали в модалку
    if (modalContent) {
        modalContent.innerHTML = details;
    }

    // Показываем модалку
    if (modal) {
        modal.style.display = 'block';
    }
}


// Инициализация раздела Настройки
async function initSettingsSection() {
    // Загрузка данных пользователя для формы
    await loadUserProfileData();
    
    // Настройка обработчиков форм
    setupSettingsForms();
    
    // Настройка переключателей
    setupToggles();
}

// Загрузка данных профиля пользователя
async function loadUserProfileData() {
    try {
        const userData = await fetchUserData();
        
        if (userData) {
            // Заполняем поля формы профиля
            document.getElementById('profile-username').value = userData.username || '';
            document.getElementById('profile-email').value = userData.email || '';
            document.getElementById('profile-name').value = userData.name || '';
            document.getElementById('profile-phone').value = userData.phone || '';
            
            // Заполняем статус 2FA
            document.getElementById('enable-2fa').checked = userData.two_factor_enabled || false;
            if (userData.two_factor_enabled) {
                document.getElementById('twofa-setup').style.display = 'none';
            }
            
            // Настройки уведомлений (заглушка)
            document.getElementById('email-notifications').checked = true;
            document.getElementById('trade-notifications').checked = true;
            document.getElementById('price-alerts').checked = false;
        }
    } catch (error) {
        console.error('Error loading user profile data:', error);
        showToast('Ошибка загрузки данных профиля', 'error');
    }
}

// Настройка обработчиков форм в разделе настроек
function setupSettingsForms() {
    // Форма профиля
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('profile-name').value;
            const phone = document.getElementById('profile-phone').value;
            
            try {
                // Здесь должен быть запрос к API для обновления профиля
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                
                const response = await fetch(`${API_BASE_URL}/users/${userData.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    },
                    body: JSON.stringify({
                        name,
                        phone
                    })
                });
                
                if (response.status === 401) {
                    const refreshed = await refreshToken();
                    if (!refreshed) {
                        showToast('Необходимо войти заново', 'error');
                        return;
                    }
                }
                
                if (!response.ok) {
                    throw new Error('Ошибка обновления профиля');
                }
                
                showToast('Профиль успешно обновлен!', 'success');
                
                // Обновляем данные в localStorage
                userData.name = name;
                userData.phone = phone;
                localStorage.setItem('userData', JSON.stringify(userData));
                
            } catch (error) {
                console.error('Error updating profile:', error);
                showToast('Ошибка обновления профиля', 'error');
            }
        });
    }
    
    // Форма безопасности
    const securityForm = document.getElementById('security-form');
    if (securityForm) {
        securityForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            if (!currentPassword || !newPassword || !confirmPassword) {
                showToast('Пожалуйста, заполните все поля', 'error');
                return;
            }
            if (newPassword !== confirmPassword) {
                showToast('Новые пароли не совпадают', 'error');
                return;
            }
            try {
                // Получаем актуальные данные пользователя из API, чтобы id точно совпадал с accessToken
                const freshUserData = await fetchUserData();
                if (!freshUserData || !freshUserData.id) {
                    showToast('Ошибка получения данных пользователя', 'error');
                    return;
                }
                const response = await fetch(`${API_BASE_URL}/users/${freshUserData.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        password: newPassword
                    })
                });
                if (response.status === 401) {
                    const refreshed = await refreshToken();
                    if (!refreshed) {
                        showToast('Необходимо войти заново', 'error');
                        localStorage.clear();
                        window.location.href = 'index.html';
                        return;
                    }
                    // Повторяем попытку после обновления токена
                    return securityForm.dispatchEvent(new Event('submit'));
                }
                if (response.status === 403) {
                    showToast('Доступ запрещён. Попробуйте войти заново.', 'error');
                    localStorage.clear();
                    window.location.href = 'index.html';
                    return;
                }
                if (!response.ok) {
                    const error = await response.json();
                    showToast(error.message || 'Ошибка изменения пароля', 'error');
                    return;
                }
                showToast('Пароль успешно изменен!', 'success');
                securityForm.reset();
            } catch (error) {
                console.error('Error changing password:', error);
                showToast('Ошибка изменения пароля', 'error');
            }
        });
    }
    
    // Кнопка сохранения настроек уведомлений
    const saveNotificationsBtn = document.getElementById('save-notifications');
    if (saveNotificationsBtn) {
        saveNotificationsBtn.addEventListener('click', function() {
            // Здесь должен быть запрос к API для сохранения настроек уведомлений
            showToast('Настройки уведомлений сохранены!', 'success');
        });
    }
}

// Настройка переключателей
function setupToggles() {
    // Переключатель 2FA
    const enable2fa = document.getElementById('enable-2fa');
    const twoFaSetup = document.getElementById('twofa-setup');
    
    if (enable2fa && twoFaSetup) {
        enable2fa.addEventListener('change', async function() {
            if (this.checked) {
                // Запрос на генерацию 2FA секрета и QR-кода
                try {
                    const response = await fetch(`${API_BASE_URL}/auth/2fa/setup`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                        }
                    });
                    
                    if (response.status === 401) {
                        const refreshed = await refreshToken();
                        if (!refreshed) {
                            showToast('Необходимо войти заново', 'error');
                            return;
                        }
                    }
                    
                    if (!response.ok) {
                        throw new Error('Ошибка настройки 2FA');
                    }
                    
                    const data = await response.json();
                    
                    // Показываем блок настройки и QR-код
                    twoFaSetup.style.display = 'block';
                    
                    const qrcodeContainer = document.getElementById('qrcode-container');
                    qrcodeContainer.innerHTML = `
                        <div class="qrcode-image">
                            <img src="${data.qrcode}" alt="QR Code for 2FA">
                        </div>
                        <p class="qrcode-secret">Секретный код: ${data.secret}</p>
                        <p class="qrcode-instruction">Отсканируйте QR-код с помощью приложения Google Authenticator, Microsoft Authenticator или аналогичного.</p>
                    `;
                } catch (error) {
                    console.error('Error setting up 2FA:', error);
                    showToast('Ошибка настройки двухфакторной аутентификации', 'error');
                    this.checked = false;
                }
            } else {
                twoFaSetup.style.display = 'none';
                
                // Здесь должен быть запрос к API для отключения 2FA
                // В этой реализации мы просто скрываем блок настройки
            }
        });
        
        // Кнопка подтверждения 2FA
        const verify2fa = document.getElementById('verify-2fa');
        if (verify2fa) {
            verify2fa.addEventListener('click', async function() {
                const code = document.getElementById('twofa-code').value;
                
                if (!code) {
                    showToast('Пожалуйста, введите код подтверждения', 'error');
                    return;
                }
                
                try {
                    const response = await fetch(`${API_BASE_URL}/auth/2fa/verify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                        },
                        body: JSON.stringify({ token: code })
                    });
                    
                    if (response.status === 401) {
                        const refreshed = await refreshToken();
                        if (!refreshed) {
                            showToast('Необходимо войти заново', 'error');
                            return;
                        }
                    }
                    
                    if (!response.ok) {
                        throw new Error('Неверный код подтверждения');
                    }
                    
                    showToast('Двухфакторная аутентификация успешно активирована!', 'success');
                    twoFaSetup.style.display = 'none';
                    
                    // Обновляем данные пользователя
                    await loadUserProfileData();
                } catch (error) {
                    console.error('Error verifying 2FA:', error);
                    showToast('Ошибка верификации кода', 'error');
                }
            });
        }
    }
}

// Вспомогательные функции

// Получение полного названия валюты по символу
function getCurrencyName(symbol) {
    const names = {
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
        'USDT': 'Tether',
        'BNB': 'Binance Coin',
        'ADA': 'Cardano',
        'SOL': 'Solana',
        'XRP': 'XRP',
        'DOT': 'Polkadot',
        'DOGE': 'Dogecoin',
        'AVAX': 'Avalanche',
        'MATIC': 'Polygon',
        'LTC': 'Litecoin',
        'LINK': 'Chainlink',
        'UNI': 'Uniswap',
        'ATOM': 'Cosmos'
    };

    return names[symbol] || symbol;
}
// Функции API, которые должны быть доступны в dashboard
// Получение данных пользователя
// Получение данных пользователя (исправлено для Google OAuth)
// Получение данных пользователя (исправлено для Google OAuth)
async function fetchUserData() {
    console.log('=== fetchUserData вызвана ===');
    
    const token = localStorage.getItem('accessToken');
    console.log('Token есть:', !!token);
    
    if (!token) {
        console.log('Нет токена, возвращаем null');
        return null;
    }

    try {
        // Сначала пробуем /auth/me (для Google OAuth и обычных пользователей)
        console.log('Пробуем /auth/me...');
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Ответ /auth/me:', response.status, response.ok);

        if (response.status === 401) {
            console.log("Token expired, attempting to refresh...");
            const refreshed = await refreshToken();
            if (refreshed) {
                return fetchUserData(); // Повторяем запрос с новым токеном
            }
            console.log("Token refresh failed");
            return null;
        }

        if (response.ok) {
            const data = await response.json();
            console.log('Данные от /auth/me:', data);
            // Сохраняем данные пользователя в localStorage
            localStorage.setItem('userData', JSON.stringify(data));
            return data;
        }

        // Если /auth/me не работает, пробуем старый способ
        console.log('/auth/me не работает, пробуем старый способ...');
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        console.log('userData из localStorage:', userData);
        
        if (userData.id) {
            console.log('Пробуем /users/' + userData.id);
            const userResponse = await fetch(`${API_BASE_URL}/users/${userData.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Ответ /users/' + userData.id + ':', userResponse.status, userResponse.ok);

            if (userResponse.ok) {
                const data = await userResponse.json();
                console.log('Данные от /users:', data);
                return data;
            }
        }

        console.log('Все попытки неудачны, возвращаем null');
        return null;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}


// Обновление токена
async function refreshToken() {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue) {
        localStorage.clear();
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshTokenValue}`
            }
        });

        if (!response.ok) {
            localStorage.clear();
            return false;
        }

        const data = await response.json();
        localStorage.setItem('accessToken', data.access_token);
        return true;
    } catch (error) {
        console.error('Token refresh error:', error);
        localStorage.clear();
        return false;
    }
}

// Получение списка кошельков
async function fetchWallets() {
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            return [];
        }

        const response = await fetch(`${API_BASE_URL}/wallets`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return fetchWallets();
            }
            return [];
        }

        if (!response.ok) {
            throw new Error('Failed to fetch wallets');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching wallets:', error);
        return [];
    }
}

// Создание нового кошелька
async function createWallet(currency) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/wallets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currency })
        });

        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return createWallet(currency);
            }
            return null;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Ошибка создания кошелька');
        }

        return data;
    } catch (error) {
        console.error('Error creating wallet:', error);
        return null;
    }
}

// Получение списка ордеров
async function fetchOrders() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        return [];
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return fetchOrders();
            }
            return [];
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Ошибка получения ордеров');
        }

        return data;
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
}

// Создание нового ордера
async function createOrder(orderData) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return createOrder(orderData);
            }
            return null;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Ошибка создания ордера');
        }

        return data;
    } catch (error) {
        console.error('Error creating order:', error);
        return null;
    }
}

// Отмена ордера
async function cancelOrder(orderId) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return cancelOrder(orderId);
            }
            return null;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Ошибка отмены ордера');
        }

        return data;
    } catch (error) {
        console.error('Error cancelling order:', error);
        return null;
    }
}

// Получение данных ордербука
async function fetchOrderBook(marketPair) {
    try {
        const response = await fetch(`${API_BASE_URL}/orderbook/${marketPair}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ошибка получения ордербука');
        }

        return data;
    } catch (error) {
        console.error('Error fetching orderbook:', error);
        return { bids: [], asks: [] };
    }
}

// Получение тикера (текущих цен)
async function fetchTicker(marketPair) {
    try {
        const response = await fetch(`${API_BASE_URL}/ticker/${marketPair}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ошибка получения тикера');
        }

        return data;
    } catch (error) {
        console.error('Error fetching ticker:', error);
        return null;
    }
}

// Получение рыночных данных
async function fetchMarketData(marketPair, period = '24h') {
    try {
        const response = await fetch(`${API_BASE_URL}/market/${marketPair}?period=${period}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ошибка получения рыночных данных');
        }

        return data;
    } catch (error) {
        console.error('Error fetching market data:', error);
        return null;
    }
}

// Выход пользователя
async function logoutUser() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Очищаем localStorage независимо от результата запроса
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');

        return true;
    } catch (error) {
        console.error('Logout error:', error);
        // Все равно очищаем localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
        return false;
    }
}
