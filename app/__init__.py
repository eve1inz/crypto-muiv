from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_cors import CORS
from flask_swagger_ui import get_swaggerui_blueprint
from flask import jsonify
# Инициализация расширений
db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()

def create_app(config_name='development'):
    app = Flask(__name__)
    
    # Загрузка конфигурации
    if config_name == 'development':
        app.config.from_object('app.config.DevelopmentConfig')
    elif config_name == 'testing':
        app.config.from_object('app.config.TestingConfig')
    else:
        app.config.from_object('app.config.ProductionConfig')
        
    # Настройка JWT
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'
    # Инициализация расширений
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    
    # Настройка Swagger UI
    swagger_url = '/api/docs'
    api_url = '/static/swagger.json'
    
    swaggerui_blueprint = get_swaggerui_blueprint(
        swagger_url,
        api_url,
        config={
            'app_name': "Crypto Exchange API"
        }
    )
    app.register_blueprint(swaggerui_blueprint, url_prefix=swagger_url)
    
    # Регистрация blueprint для API
    with app.app_context():
        from app.api import api_bp
        app.register_blueprint(api_bp, url_prefix='/api/v1')
        
        # Создаем таблицы базы данных
        db.create_all()
    
    @app.route('/health')
    def health_check():
        return {'status': 'ok'}, 200
        
    

    @jwt.user_identity_loader
    def user_identity_lookup(user):
        return str(user) if user is not None else None
    @app.route('/api/debug/routes')
    def list_routes():
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'path': str(rule)
            })
        return jsonify(routes)
    
    
    return app
