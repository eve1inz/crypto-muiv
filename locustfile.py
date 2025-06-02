from locust import HttpUser, task, between
import json
import random

class CryptoExchangeUser(HttpUser):
    wait_time = between(1, 3)  # Время ожидания между задачами (1-3 секунды)
    
    # Хранение учетных данных и токенов
    username = None
    access_token = None
    wallet_ids = []
    order_ids = []
    
    def on_start(self):
        """Действия при старте тестирования для каждого пользователя"""
        # Регистрация пользователя с уникальным именем
        self.username = f"loadtest_{random.randint(1000, 9999)}"
        
        # Регистрация
        register_response = self.client.post("/api/v1/auth/register", json={
            "username": self.username,
            "email": f"{self.username}@example.com",
            "password": "password123"
        })
        
        # Вход
        login_response = self.client.post("/api/v1/auth/login", json={
            "username": self.username,
            "password": "password123"
        })
        
        login_data = login_response.json()
        self.access_token = login_data.get("access_token")
        
        # Установка заголовка авторизации для всех будущих запросов
        self.client.headers.update({"Authorization": f"Bearer {self.access_token}"})
        
        # Создание кошельков
        self.create_wallets()
    
    def create_wallets(self):
        """Создание тестовых кошельков"""
        for currency in ["BTC", "USDT", "ETH"]:
            response = self.client.post("/api/v1/wallets", json={"currency": currency})
            if response.status_code == 201:
                wallet_id = response.json().get("id")
                self.wallet_ids.append(wallet_id)
                
                # Пополнение кошелька
                self.client.post(f"/api/v1/wallets/{wallet_id}/deposit", json={"amount": 1000.0})
    
    @task(3)
    def get_wallets(self):
        """Получение списка кошельков (высокий приоритет)"""
        self.client.get("/api/v1/wallets")
    
    @task(2)
    def create_order(self):
        """Создание ордера (средний приоритет)"""
        if len(self.wallet_ids) > 0:
            order_data = {
                "base_currency": "BTC",
                "quote_currency": "USDT",
                "type": random.choice(["buy", "sell"]),
                "price": round(random.uniform(19000.0, 21000.0), 2),
                "amount": round(random.uniform(0.01, 0.1), 8)
            }
            
            response = self.client.post("/api/v1/orders", json=order_data)
            if response.status_code == 201:
                order_id = response.json().get("id")
                self.order_ids.append(order_id)
    
    @task(2)
    def get_orders(self):
        """Получение списка ордеров (средний приоритет)"""
        self.client.get("/api/v1/orders")
    
    @task(1)
    def cancel_order(self):
        """Отмена ордера (низкий приоритет)"""
        if len(self.order_ids) > 0:
            order_id = random.choice(self.order_ids)
            self.client.delete(f"/api/v1/orders/{order_id}")
            self.order_ids.remove(order_id)
    
    @task(4)
    def get_market_data(self):
        """Получение рыночных данных (наивысший приоритет)"""
        market_pair = random.choice(["BTC-USDT", "ETH-USDT", "ETH-BTC"])
        self.client.get(f"/api/v1/ticker/{market_pair}")
        self.client.get(f"/api/v1/orderbook/{market_pair}")
