from app import create_app, db
from app.models.user import User
from app.models.wallet import Wallet
from app.models.order import Order
from app.models.transaction import Transaction, Trade
import logging
import os
from flask import send_from_directory, current_app, redirect, request
from oauthlib.oauth2 import WebApplicationClient

# Настройка логирования
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler()]
)

app = create_app('development')

# Получаем абсолютный путь к директории frontend
frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')

# Маршрут для главной страницы
@app.route('/')
def index():
    return send_from_directory(frontend_dir, 'index.html')

# Маршрут для dashboard
@app.route('/dashboard')
def dashboard():
    return send_from_directory(frontend_dir, 'dashboard.html')

# Маршрут для обслуживания CSS, JS и других статических файлов из frontend
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(frontend_dir, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(frontend_dir, 'js'), filename)

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(os.path.join(frontend_dir, 'images'), filename)

# Общий обработчик для других статических файлов в корне frontend
@app.route('/<path:filename>')
def serve_static(filename):
    if os.path.exists(os.path.join(frontend_dir, filename)):
        return send_from_directory(frontend_dir, filename)
    return "File not found", 404


@app.shell_context_processor
def make_shell_context():
    return {
        'db': db, 
        'User': User, 
        'Wallet': Wallet, 
        'Order': Order, 
        'Transaction': Transaction,
        'Trade': Trade
    }

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
