import pytest
from app import create_app, db
from app.models.user import User
from app.models.wallet import Wallet
from app.models.order import Order, OrderType
from app.models.transaction import Transaction

@pytest.fixture
def app():
    """Создает экземпляр приложения для тестирования"""
    app = create_app('testing')
    return app

@pytest.fixture
def client(app):
    """Создает тестовый клиент"""
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

@pytest.fixture
def auth_headers(client):
    """Создает авторизованного пользователя и возвращает заголовки с токеном"""
    # Создаем пользователя
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    
    with client.application.app_context():
        db.session.add(user)
        db.session.commit()
        
        # Логиним пользователя и получаем токен
        response = client.post('/api/v1/auth/login', 
                            json={'username': 'testuser', 'password': 'password123'})
        token = response.json['access_token']
        
        # Возвращаем заголовки с токеном
        return {'Authorization': f'Bearer {token}'}

@pytest.fixture
def test_user(client):
    """Создает и возвращает тестового пользователя"""
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    
    with client.application.app_context():
        db.session.add(user)
        db.session.commit()
        return user
