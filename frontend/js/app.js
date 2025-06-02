// Базовый URL для API
const API_BASE_URL = 'http://localhost:5000/api/v1';

// Проверяем, является ли текущий URL обратным вызовом от Google
// Проверяем, является ли текущий URL обратным вызовом от Google
function checkGoogleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && (
        window.location.pathname === '/api/v1/oauth2/callback' || 
        window.location.pathname === '/oauth2/callback' ||
        window.location.pathname.includes('oauth2/callback')
    )) {
        handleGoogleCallback();
        return true;
    }
    return false;
}


document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, есть ли ошибки OAuth в URL
    const urlParams = new URLSearchParams(window.location.search);
    const oauthError = urlParams.get('error');
    const errorMessage = urlParams.get('message');
    
    if (oauthError) {
        let message = 'Ошибка авторизации';
        switch(oauthError) {
            case 'oauth_error':
                message = `Ошибка OAuth: ${errorMessage || 'Неизвестная ошибка'}`;
                break;
            case 'missing_code':
                message = 'Отсутствует код авторизации от Google';
                break;
            case 'invalid_state':
                message = 'Недействительное состояние авторизации';
                break;
            case 'expired_state':
                message = 'Время авторизации истекло, попробуйте снова';
                break;
            case 'token_request_failed':
                message = 'Ошибка получения токена от Google';
                break;
            case 'userinfo_request_failed':
                message = 'Ошибка получения данных пользователя от Google';
                break;
            case 'email_not_verified':
                message = 'Email в Google аккаунте не подтвержден';
                break;
            case 'callback_error':
                message = `Ошибка обработки ответа: ${errorMessage || 'Неизвестная ошибка'}`;
                break;
        }
        
        toastr.error(message);
        
        // Очищаем URL от параметров ошибки
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }

    // Сначала проверяем Google callback
    if (checkGoogleCallback()) {
        return; // Прерываем выполнение остальных инициализаций
    }

    // Остальная инициализация...
    initializeAnimations();
    setupMobileMenu();
    setupModals();
    initCryptoTable();
    setupTabs();
    setupOrderForm();
    initOrderBook();
    checkAuthentication();
    initChart();
});


// Функции для работы с API

// Регистрация нового пользователя
async function registerUser(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Ошибка регистрации');
        }
        
        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// Вход пользователя
async function loginUser(credentials) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Ошибка входа');
        }
        
        // Сохраняем токены в localStorage
        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
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

// Показать/скрыть пароль - убираем jQuery зависимость
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('toggle-password')) {
        const input = document.getElementById('login-password');
        if (input.type === 'password') {
            input.type = 'text';
            e.target.innerHTML = '&#128064;'; // другой значок
        } else {
            input.type = 'password';
            e.target.innerHTML = '&#128065;';
        }
    }
});


// Удаляем старую jQuery-логику входа с /api/auth/check-2fa

// Обновление токена
async function refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
        localStorage.clear();
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`
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


// Получение данных пользователя
// Получение данных пользователя
async function fetchUserData() {
    const token = localStorage.getItem('accessToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    if (!token || !userData.id) {
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userData.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            console.log("Token expired, attempting to refresh...");
            const refreshed = await refreshToken();
            if (refreshed) {
                return fetchUserData(); // Повторяем запрос с новым токеном
            }
            console.log("Token refresh failed");
            return null;
        }
        
        if (!response.ok) {
            console.error("Error response:", await response.text());
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
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

// Проверка аутентификации пользователя
function checkAuthentication() {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        // Пользователь авторизован
        const user = JSON.parse(userData);
        
        // Обновляем UI для авторизованного пользователя
        const loginBtn = document.querySelector('.btn-login');
        if (loginBtn) {
            loginBtn.textContent = user.username;
            loginBtn.href = 'dashboard.html';
            loginBtn.classList.add('logged-in');
            
            // Добавляем кнопку выхода
            const navLinks = document.querySelector('.nav-links');
            if (navLinks && !document.querySelector('.logout-btn')) {
                const logoutItem = document.createElement('li');
                const logoutBtn = document.createElement('a');
                logoutBtn.href = '#';
                logoutBtn.textContent = 'Выход';
                logoutBtn.classList.add('logout-btn');
                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await logoutUser();
                    window.location.reload();
                });
                logoutItem.appendChild(logoutBtn);
                navLinks.appendChild(logoutItem);
            }
        }
    }
}

// Инициализация анимаций
// Инициализация анимаций
function initializeAnimations() {
    // Создание частиц для фона героя
    createParticles();

    // Инициализация GSAP анимаций (если доступно)
    if (typeof gsap !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        
        // Анимации для секции героя
        gsap.from('.hero-title', {
            y: 50,
            opacity: 0,
            duration: 1,
            ease: 'power3.out'
        });

        gsap.from('.hero-subtitle', {
            y: 30,
            opacity: 0,
            duration: 1,
            delay: 0.3,
            ease: 'power3.out'
        });

        gsap.from('.hero-cta', {
            y: 20,
            opacity: 0,
            duration: 1,
            delay: 0.6,
            ease: 'power3.out'
        });

        // Анимации прокрутки для секций
        const sections = document.querySelectorAll('section:not(.hero)');
        sections.forEach(section => {
            gsap.from(section, {
                scrollTrigger: {
                    trigger: section,
                    start: 'top 80%',
                    toggleActions: 'play none none none'
                },
                opacity: 0,
                y: 50,
                duration: 0.8,
                ease: 'power2.out'
            });
        });

        // Анимация для карточек функций
        gsap.from('.feature-card', {
            scrollTrigger: {
                trigger: '.features-grid',
                start: 'top 80%',
            },
            y: 50,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: 'back.out(1.7)'
        });
    } else {
        console.warn('GSAP not loaded, using fallback animations');
        // Простые CSS анимации как fallback
        addSimpleAnimations();
    }
}

// Добавляем простые анимации как fallback
function addSimpleAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        .hero-title, .hero-subtitle, .hero-cta {
            animation: fadeInUp 1s ease-out forwards;
        }
        .hero-subtitle { animation-delay: 0.3s; }
        .hero-cta { animation-delay: 0.6s; }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}


// Создание фона с частицами
function createParticles() {
    const particlesContainer = document.querySelector('.particles-container');
    if (!particlesContainer) return;

    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        // Случайные позиции и размеры
        const size = Math.random() * 5 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;

        // Случайная прозрачность и цвет
        const opacity = Math.random() * 0.5 + 0.1;
        const hue = Math.random() * 40 + 180; // Диапазон синего-голубого
        particle.style.backgroundColor = `hsla(${hue}, 100%, 70%, ${opacity})`;

        // Случайная продолжительность и задержка анимации
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;
        particle.style.animation = `floatParticle ${duration}s linear infinite`;
        particle.style.animationDelay = `${delay}s`;

        particlesContainer.appendChild(particle);
    }

    // Эффект параллакса при движении мыши
    document.addEventListener('mousemove', (e) => {
        const particles = document.querySelectorAll('.particle');
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;

        particles.forEach(particle => {
            const speed = parseFloat(particle.style.width) * 0.05;
            const offsetX = (mouseX - 0.5) * speed;
            const offsetY = (mouseY - 0.5) * speed;
            particle.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });
    });
}

// Настройка мобильного меню
function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (!menuToggle || !navLinks) return;

    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');

        // Анимация гамбургера в X
        const bars = document.querySelectorAll('.bar');
        if (menuToggle.classList.contains('active')) {
            bars[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
            bars[1].style.opacity = '0';
            bars[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
        } else {
            bars[0].style.transform = 'none';
            bars[1].style.opacity = '1';
            bars[2].style.transform = 'none';
        }
    });

    // Закрытие меню при нажатии на ссылку
    const navItems = document.querySelectorAll('.nav-links a');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navLinks.classList.remove('active');
            menuToggle.classList.remove('active');

            const bars = document.querySelectorAll('.bar');
            bars[0].style.transform = 'none';
            bars[1].style.opacity = '1';
            bars[2].style.transform = 'none';
        });
    });
}

// Настройка модальных окон
function setupModals() {
    // Модальное окно входа
    const loginBtn = document.querySelector('.btn-login');
    const loginModal = document.getElementById('login-modal');
    
    if (loginBtn && loginModal) {
        const closeLoginModal = loginModal.querySelector('.close-modal');
        
        loginBtn.addEventListener('click', (e) => {
            // Если пользователь уже вошел, перенаправляем на страницу кабинета
            if (localStorage.getItem('accessToken')) {
                e.preventDefault();
                window.location.href = 'dashboard.html';
                return;
            }
            
            e.preventDefault();
            loginModal.style.display = 'block';
        });
        
        if (closeLoginModal) {
            closeLoginModal.addEventListener('click', () => {
                loginModal.style.display = 'none';
            });
        }
    }

    // Модальное окно регистрации
    const registerModal = document.getElementById('register-modal');
    
    if (registerModal) {
        const registerLink = document.querySelector('.register-link');
        const closeRegisterModal = registerModal.querySelector('.close-modal');
        const loginLink = document.querySelector('.login-link');
        
        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (loginModal) loginModal.style.display = 'none';
                registerModal.style.display = 'block';
            });
        }
        
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                registerModal.style.display = 'none';
                if (loginModal) loginModal.style.display = 'block';
            });
        }
        
        if (closeRegisterModal) {
            closeRegisterModal.addEventListener('click', () => {
                registerModal.style.display = 'none';
            });
        }
    }

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (e) => {
        if (loginModal && e.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (registerModal && e.target === registerModal) {
            registerModal.style.display = 'none';
        }
    });

    // Обработка отправки формы входа
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        let twofaRequired = false;
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameField = document.getElementById('login-username');
            const passwordField = document.getElementById('login-password');
            const twofaField = document.getElementById('login-2fa');
            const twofaGroup = document.getElementById('login-2fa-group');

            if (!usernameField || !passwordField) {
                alert('Ошибка: поля формы не найдены');
                return;
            }
            const username = usernameField.value;
            const password = passwordField.value;
            const twofa = twofaField ? twofaField.value : '';

            if (!username || !password) {
                alert('Пожалуйста, заполните все поля');
                return;
            }

            try {
                // Первый запрос: без 2FA
                let credentials = { username, password };
                if (twofaRequired && twofa) {
                    credentials.twofa = twofa;
                }
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });
                const data = await response.json();
                if (!response.ok) {
                    // Если требуется 2FA
                    if (data.two_factor_required) {
                        twofaRequired = true;
                        if (twofaGroup) twofaGroup.style.display = '';
                        if (twofaField) twofaField.focus();
                        alert('Введите код двухфакторной аутентификации');
                        return;
                    }
                    alert(data.message || 'Ошибка входа');
                    return;
                }
                // Успешный вход
                localStorage.setItem('accessToken', data.access_token);
                localStorage.setItem('refreshToken', data.refresh_token);
                localStorage.setItem('userData', JSON.stringify(data.user));
                window.location.href = 'dashboard.html';
            } catch (error) {
                alert(`Ошибка входа: ${error.message}`);
            }
        });
    }

    // Обработка отправки формы регистрации
    const registerForm = document.querySelector('.register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameField = document.getElementById('register-username');
            const emailField = document.getElementById('register-email');
            const passwordField = document.getElementById('register-password');
            const confirmPasswordField = document.getElementById('register-confirm');

            if (!usernameField || !emailField || !passwordField || !confirmPasswordField) {
                alert('Ошибка: поля формы не найдены');
                return;
            }
            const username = usernameField.value;
            const email = emailField.value;
            const password = passwordField.value;
            const confirmPassword = confirmPasswordField.value;

            if (!username || !email || !password || !confirmPassword) {
                alert('Пожалуйста, заполните все поля');
                return;
            }
            if (password !== confirmPassword) {
                alert('Пароли не совпадают');
                return;
            }
            try {
                const result = await registerUser({ username, email, password });
                // Автоматический вход после успешной регистрации
                try {
                    const loginResult = await loginUser({ username, password });
                    alert('Регистрация успешна! Добро пожаловать.');
                    // Очищаем форму и закрываем модалку
                    registerForm.reset();
                    if (registerModal) registerModal.style.display = 'none';
                    window.location.href = 'dashboard.html';
                } catch (loginError) {
                    alert('Регистрация успешна, но автоматический вход не удался. Войдите вручную.');
                    registerForm.reset();
                    if (registerModal) registerModal.style.display = 'none';
                    if (loginModal) loginModal.style.display = 'block';
                }
            } catch (error) {
                alert(error.message || 'Ошибка регистрации');
            }
        });
    }

    // Обработка клика по кнопке "Войти с Google"
    const googleLoginBtn = document.getElementById('google-login');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginWithGoogle();
        });
    }
}

// Инициализация таблицы криптовалют
async function initCryptoTable() {
    const tableBody = document.getElementById('crypto-data');
    if (!tableBody) return;

    try {
        // Получаем данные тикеров для нескольких валютных пар
        const pairs = ['BTC-USDT', 'ETH-USDT', 'BNB-USDT', 'ADA-USDT', 'SOL-USDT', 'XRP-USDT', 'DOT-USDT'];
        const tickerPromises = pairs.map(pair => fetchTicker(pair));
        let tickers = await Promise.all(tickerPromises);
        tickers = tickers.filter(ticker => ticker !== null);

        if (tickers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">Ошибка загрузки данных</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        tickers.forEach(ticker => {
            const symbol = ticker.symbol.split('-');
            const name = getCurrencyName(symbol[0]);
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            nameCell.textContent = name;
            const symbolCell = document.createElement('td');
            symbolCell.textContent = symbol[0];
            const priceCell = document.createElement('td');
            const lastPrice = (ticker.last_price !== undefined && ticker.last_price !== null) ? ticker.last_price : 0;
            priceCell.textContent = `$${lastPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const changeCell = document.createElement('td');
            let changeValue = '—';
            if (ticker['24h_change'] !== undefined && ticker['24h_change'] !== null) {
                changeValue = ticker['24h_change'] > 0 ? `+${ticker['24h_change']}%` : `${ticker['24h_change']}%`;
            }
            changeCell.textContent = changeValue;
            changeCell.className = (ticker['24h_change'] !== undefined && ticker['24h_change'] !== null && ticker['24h_change'] >= 0) ? 'price-up' : 'price-down';
            row.appendChild(nameCell);
            row.appendChild(symbolCell);
            row.appendChild(priceCell);
            row.appendChild(changeCell);
            tableBody.appendChild(row);
        });
        // Реализация поиска
        const searchInput = document.getElementById('crypto-search');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const rows = tableBody.querySelectorAll('tr');
                
                rows.forEach(row => {
                    const name = row.cells[0].textContent.toLowerCase();
                    const symbol = row.cells[1].textContent.toLowerCase();
                    
                    if (name.includes(searchTerm) || symbol.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        }
        
        // Удаляем имитацию обновления цен в реальном времени на главной
    } catch (error) {
        console.error('Error initializing crypto table:', error);
        tableBody.innerHTML = '<tr><td colspan="4">Ошибка загрузки данных</td></tr>';
    }
}

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

// Настройка переключения вкладок
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (!tabButtons.length || !tabContents.length) return;

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Удаляем активный класс со всех кнопок и содержимого
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Добавляем активный класс на нажатую кнопку и соответствующее содержимое
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
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
        // Установка начального значения цены
        buyPrice.value = '19234.56';

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
        
        // Обновление цены при загрузке тикера
        fetchTicker('BTC-USDT').then(ticker => {
            if (ticker && ticker.last_price) {
                buyPrice.value = ticker.last_price.toFixed(2);
                calculateBuyTotal();
            }
        }).catch(error => {
            console.error('Error updating price:', error);
        });
    }

    // Расчеты для формы продажи
    const sellAmount = document.getElementById('sell-amount');
    const sellPrice = document.getElementById('sell-price');
    const sellTotal = document.getElementById('sell-total');
    
    if (sellAmount && sellPrice && sellTotal) {
        // Установка начального значения цены
        sellPrice.value = '19234.56';

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
        
        // Обновление цены при загрузке тикера
        fetchTicker('BTC-USDT').then(ticker => {
            if (ticker && ticker.last_price) {
                sellPrice.value = ticker.last_price.toFixed(2);
                calculateSellTotal();
            }
        }).catch(error => {
            console.error('Error updating price:', error);
        });
    }

    // Обработка отправки формы покупки
    const buyForm = document.querySelector('#buy form');
    if (buyForm) {
        buyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Проверка авторизации
            if (!localStorage.getItem('accessToken')) {
                alert('Для совершения торговых операций необходимо войти в систему');
                return;
            }
            
            if (!buyAmount || !buyPrice) return;
            
            const orderData = {
                base_currency: 'BTC',
                quote_currency: 'USDT',
                type: 'buy',
                amount: parseFloat(buyAmount.value),
                price: parseFloat(buyPrice.value)
            };
            
            try {
                const result = await createOrder(orderData);
                if (result) {
                    alert('Ордер на покупку успешно создан!');
                    buyForm.reset();
                    buyPrice.value = '19234.56'; // Сбрасываем на значение по умолчанию
                } else {
                    alert('Ошибка при создании ордера');
                }
            } catch (error) {
                alert(`Ошибка: ${error.message}`);
            }
        });
    }

    // Обработка отправки формы продажи
    const sellForm = document.querySelector('#sell form');
    if (sellForm) {
        sellForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Проверка авторизации
            if (!localStorage.getItem('accessToken')) {
                alert('Для совершения торговых операций необходимо войти в систему');
                return;
            }
            
            if (!sellAmount || !sellPrice) return;
            
            const orderData = {
                base_currency: 'BTC',
                quote_currency: 'USDT',
                type: 'sell',
                amount: parseFloat(sellAmount.value),
                price: parseFloat(sellPrice.value)
            };
            
            try {
                const result = await createOrder(orderData);
                if (result) {
                    alert('Ордер на продажу успешно создан!');
                    sellForm.reset();
                    sellPrice.value = '19234.56'; // Сбрасываем на значение по умолчанию
                } else {
                    alert('Ошибка при создании ордера');
                }
            } catch (error) {
                alert(`Ошибка: ${error.message}`);
            }
        });
    }
}

// Инициализация ордербука
async function initOrderBook() {
    const sellOrdersContainer = document.querySelector('.sell-orders');
    const buyOrdersContainer = document.querySelector('.buy-orders');
    const currentPriceElement = document.querySelector('.current-price');
    
    if (!sellOrdersContainer || !buyOrdersContainer) return;

    try {
        // Получаем данные ордербука с API
        const orderBookData = await fetchOrderBook('BTC-USDT');
        
        // Если нет данных или произошла ошибка, используем заглушку
        if (!orderBookData || !orderBookData.bids || !orderBookData.asks) {
            // Заглушка для ордеров продажи (самая высокая цена первой)
            const mockSellOrders = [
                { price: 19450.00, amount: 0.235 },
                { price: 19400.00, amount: 0.158 },
                { price: 19350.00, amount: 0.422 },
                { price: 19300.00, amount: 0.311 },
                { price: 19250.00, amount: 0.185 }
            ];

            // Заглушка для ордеров покупки (самая высокая цена первой)
            const mockBuyOrders = [
                { price: 19200.00, amount: 0.265 },
                { price: 19150.00, amount: 0.378 },
                { price: 19100.00, amount: 0.142 },
                { price: 19050.00, amount: 0.521 },
                { price: 19000.00, amount: 0.189 }
            ];
            
            // Заполняем контейнеры заглушками
            populateOrderBook(sellOrdersContainer, mockSellOrders, 'sell');
            populateOrderBook(buyOrdersContainer, mockBuyOrders, 'buy');
            
            // Устанавливаем текущую цену
            if (currentPriceElement) {
                currentPriceElement.textContent = '$19,234.56';
            }
        } else {
            // Заполняем контейнеры реальными данными
            populateOrderBook(sellOrdersContainer, orderBookData.asks, 'sell');
            populateOrderBook(buyOrdersContainer, orderBookData.bids, 'buy');
            
            // Устанавливаем текущую цену на основе спреда
            if (currentPriceElement && orderBookData.bids.length > 0 && orderBookData.asks.length > 0) {
                const highestBid = orderBookData.bids[0].price;
                const lowestAsk = orderBookData.asks[0].price;
                const midPrice = (highestBid + lowestAsk) / 2;
                currentPriceElement.textContent = `$${midPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            }
        }
        
        // Настраиваем периодическое обновление ордербука
        setupOrderBookUpdates();
    } catch (error) {
        console.error('Error initializing order book:', error);
        
        // В случае ошибки используем заглушку
        const mockSellOrders = [
            { price: 19450.00, amount: 0.235 },
            { price: 19400.00, amount: 0.158 },
            { price: 19350.00, amount: 0.422 },
            { price: 19300.00, amount: 0.311 },
            { price: 19250.00, amount: 0.185 }
        ];

        const mockBuyOrders = [
            { price: 19200.00, amount: 0.265 },
            { price: 19150.00, amount: 0.378 },
            { price: 19100.00, amount: 0.142 },
            { price: 19050.00, amount: 0.521 },
            { price: 19000.00, amount: 0.189 }
        ];
        
        populateOrderBook(sellOrdersContainer, mockSellOrders, 'sell');
        populateOrderBook(buyOrdersContainer, mockBuyOrders, 'buy');
        
        if (currentPriceElement) {
            currentPriceElement.textContent = '$19,234.56';
        }
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
        
        container.appendChild(orderRow);
    });
}

// Настройка периодического обновления ордербука
function setupOrderBookUpdates() {
    const sellOrdersContainer = document.querySelector('.sell-orders');
    const buyOrdersContainer = document.querySelector('.buy-orders');
    const currentPriceElement = document.querySelector('.current-price');
    
    if (!sellOrdersContainer || !buyOrdersContainer) return;
    
    // Обновление каждые 3 секунды
    setInterval(async () => {
        try {
            // Получаем обновленные данные ордербука
            const orderBookData = await fetchOrderBook('BTC-USDT');
            
            if (orderBookData && orderBookData.bids && orderBookData.asks) {
                // Заполняем контейнеры обновленными данными
                populateOrderBook(sellOrdersContainer, orderBookData.asks, 'sell');
                populateOrderBook(buyOrdersContainer, orderBookData.bids, 'buy');
                
                // Обновляем текущую цену
                if (currentPriceElement && orderBookData.bids.length > 0 && orderBookData.asks.length > 0) {
                    const highestBid = orderBookData.bids[0].price;
                    const lowestAsk = orderBookData.asks[0].price;
                    const midPrice = (highestBid + lowestAsk) / 2;
                    currentPriceElement.textContent = `$${midPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                }
            } else {
                // Если нет данных, симулируем обновление существующих ордеров
                simulateOrderBookUpdates();
            }
        } catch (error) {
            console.error('Error updating order book:', error);
            // В случае ошибки симулируем обновление
            simulateOrderBookUpdates();
        }
    }, 3000);
}

// Симуляция обновления ордербука
function simulateOrderBookUpdates() {
    const sellOrdersContainer = document.querySelector('.sell-orders');
    const buyOrdersContainer = document.querySelector('.buy-orders');
    const currentPriceElement = document.querySelector('.current-price');
    
    if (!sellOrdersContainer || !buyOrdersContainer) return;
    
    // Случайная сторона ордербука (покупка или продажа)
    const isBuy = Math.random() > 0.5;
    const container = isBuy ? buyOrdersContainer : sellOrdersContainer;
    
    // Случайный индекс для обновления
    const rows = container.querySelectorAll('.order-row');
    if (rows.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * rows.length);
    const row = rows[randomIndex];
    
    // Обновление количества и общей суммы
    const cells = row.querySelectorAll('div');
    const price = parseFloat(cells[0].textContent);
    const oldAmount = parseFloat(cells[1].textContent);
    
    // Случайное изменение количества (-30% до +30% от текущего количества)
    const amountChange = oldAmount * (Math.random() * 0.6 - 0.3);
    const newAmount = Math.max(0.001, oldAmount + amountChange);
    const newTotal = price * newAmount;
    
    // Обновление ячеек с анимацией
    cells[1].textContent = newAmount.toFixed(3);
    cells[2].textContent = newTotal.toFixed(2);
    
    // Анимация мигания
    row.style.backgroundColor = isBuy ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    setTimeout(() => {
        row.style.backgroundColor = '';
    }, 500);
    
    // Обновление текущей цены
    if (currentPriceElement) {
        const currentPrice = parseFloat(currentPriceElement.textContent.replace('$', '').replace(',', ''));
        const priceChange = currentPrice * (Math.random() * 0.002 - 0.001); // Небольшое изменение цены
        const newPrice = currentPrice + priceChange;
        currentPriceElement.textContent = `$${newPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }
}

// Добавляем CSS для анимации частиц
function addParticleStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatParticle {
            0% { transform: translate(0, 0); }
            25% { transform: translate(10px, 10px); }
            50% { transform: translate(0, 20px); }
            75% { transform: translate(-10px, 10px); }
            100% { transform: translate(0, 0); }
        }
        
        .particle {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
        }
    `;
    
    document.head.appendChild(style);
}

// Вызываем функцию добавления стилей
addParticleStyles();

// Инициализация графика Chart.js
// Инициализация графика Chart.js
function initChart() {
    const chartEl = document.getElementById('main-chart');
    if (chartEl) {
        // Получаем историю цен с backend
        fetch(`${API_BASE_URL}/market-history/BTC-USDT?days=1`)  // Исправлен путь
            .then(res => res.json())
            .then(result => {
                if (!result.history || !Array.isArray(result.history)) {
                    throw new Error('Нет данных для графика');
                }
                const labels = result.history.map(point => point.time);
                const prices = result.history.map(point => point.price);
                const data = {
                    labels: labels,
                    datasets: [{
                        label: 'BTC/USDT',
                        data: prices,
                        borderColor: '#00F3FF',
                        backgroundColor: 'rgba(0,243,255,0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 2
                    }]
                };
                const config = {
                    type: 'line',
                    data: data,
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { display: false },
                            tooltip: { enabled: true }
                        },
                        scales: {
                            x: { display: true, title: { display: false } },
                            y: { display: true, title: { display: false } }
                        }
                    }
                };
                new Chart(chartEl, config);
            })
            .catch(err => {
                chartEl.parentElement.querySelector('.chart-placeholder').style.display = '';
                console.error('Ошибка загрузки графика:', err);
            });
    }
}


// Google OAuth функции
async function loginWithGoogle() {
    try {
        // Get the Google OAuth URL from our backend
        const response = await fetch(`${API_BASE_URL}/auth/google/login`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to initiate Google login');
        }

        // Store the current URL to redirect back after login
        localStorage.setItem('preLoginPage', window.location.href);
        
        // Redirect to Google's OAuth page
        window.location.href = data.auth_url;
    } catch (error) {
        console.error('Google login error:', error);
        toastr.error('Failed to initiate Google login. Please try again.');
    }
}

// Handle Google OAuth callback
// Handle Google OAuth callback
async function handleGoogleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
        console.error('Google auth error:', error);
        toastr.error('Ошибка авторизации через Google');
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }

    try {
        // Используем правильный callback endpoint
        const response = await fetch(`${API_BASE_URL}/oauth2/callback?${urlParams.toString()}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.access_token) {
            // Сохраняем токены и данные пользователя
            localStorage.setItem('accessToken', data.access_token);
            localStorage.setItem('refreshToken', data.refresh_token);
            localStorage.setItem('userData', JSON.stringify(data.user));

            console.log('Успешная авторизация через Google');

            // Показываем уведомление об успешном входе
            toastr.success('Вы успешно вошли через Google!');

            // Даем время для отображения уведомления перед редиректом
            setTimeout(() => {
                // Проверяем наличие returnUrl в localStorage
                const returnUrl = localStorage.getItem('returnUrl') || '/dashboard.html';
                localStorage.removeItem('returnUrl'); // Очищаем returnUrl
                window.location.href = returnUrl;
            }, 1000);
        } else {
            throw new Error('Не получены данные авторизации');
        }
    } catch (error) {
        console.error('Ошибка при обработке Google callback:', error);
        toastr.error('Произошла ошибка при входе через Google');
        setTimeout(() => window.location.href = '/', 2000);
    }
}


// Функция для инициации входа через Google
async function initiateGoogleLogin() {
    try {
        // Store current page URL as return URL if we're not on the login page
        if (!window.location.pathname.includes('index.html')) {
            localStorage.setItem('returnUrl', window.location.pathname);
        }
        
        // Получаем URL для авторизации через API
        const response = await fetch(`${API_BASE_URL}/auth/google/login`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка получения ссылки авторизации');
        }
        
        const data = await response.json();
        
        if (data.auth_url) {
            // Перенаправляем пользователя на Google OAuth
            window.location.href = data.auth_url;
        } else {
            throw new Error('Не получена ссылка авторизации');
        }
        
    } catch (error) {
        console.error('Google login error:', error);
        // Показываем ошибку пользователю (если у вас есть функция для этого)
        if (typeof showToast !== 'undefined') {
            showToast(`Ошибка входа через Google: ${error.message}`, 'error');
        } else {
            alert(`Ошибка входа через Google: ${error.message}`);
        }
    }
}
