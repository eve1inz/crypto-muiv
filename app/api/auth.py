from flask import request, jsonify, url_for, current_app, redirect
from flask_restful import Resource
from flask_jwt_extended import (
    create_access_token, create_refresh_token, get_jwt_identity, jwt_required, get_jwt
)
from app.models.user import User
from app import db, jwt
from datetime import datetime, timedelta
import re
from app.services.auth_service import AuthService
import requests
from oauthlib.oauth2 import WebApplicationClient
import secrets

# Blacklist для токенов
blacklist = set()

# Хранилище для OAuth состояний (в production используйте Redis)
oauth_states = {}
class MeResource(Resource):
    @jwt_required()
    def get(self):
        """Получить данные текущего пользователя"""
        current_user_id = get_jwt_identity()
        user = User.query.get_or_404(current_user_id)
        return user.to_dict(), 200

class Setup2FAResource(Resource):
    @jwt_required()
    def post(self):
        """Инициализирует настройку 2FA и возвращает QR-код"""
        current_user_id = get_jwt_identity()
        
        # Генерация секрета
        secret, error = AuthService.generate_2fa_secret(current_user_id)
        if error:
            return {"message": error}, 400
            
        # Генерация QR-кода
        qr_code, error = AuthService.get_2fa_qrcode(current_user_id)
        if error:
            return {"message": error}, 400
            
        return {
            "secret": secret,
            "qrcode": qr_code
        }, 200

class Verify2FAResource(Resource):
    @jwt_required()
    def post(self):
        """Верифицирует и активирует 2FA"""
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'token' not in data:
            return {"message": "Verification token is required"}, 400
            
        success, error = AuthService.enable_2fa(current_user_id, data['token'])
        if error:
            return {"message": error}, 400
            
        return {"message": "Two-factor authentication enabled successfully"}, 200

@jwt.token_in_blocklist_loader
def check_if_token_in_blacklist(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return jti in blacklist

class RegisterResource(Resource):
    def post(self):
        data = request.get_json()
        
        # Валидация входных данных
        if not all(k in data for k in ('username', 'email', 'password')):
            return {"message": "Missing required fields"}, 400
            
        # Проверка формата email
        if not re.match(r"[^@]+@[^@]+\.[^@]+", data['email']):
            return {"message": "Invalid email format"}, 400
            
        # Проверка силы пароля
        if len(data['password']) < 8:
            return {"message": "Password must be at least 8 characters long"}, 400
            
        # Проверка существования пользователя
        if User.query.filter_by(username=data['username']).first():
            return {"message": "Username already exists"}, 400
            
        if User.query.filter_by(email=data['email']).first():
            return {"message": "Email already exists"}, 400
            
        # Создание нового пользователя
        user = User(
            username=data['username'],
            email=data['email']
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return {"message": "User created successfully", "user_id": user.id}, 201

class LoginResource(Resource):
    def post(self):
        data = request.get_json()
        
        if not all(k in data for k in ('username', 'password')):
            return {"message": "Missing required fields"}, 400
            
        # Поиск пользователя
        user = User.query.filter_by(username=data['username']).first()
        
        if not user or not user.check_password(data['password']):
            return {"message": "Invalid credentials"}, 401
            
        if not user.is_active:
            return {"message": "Account is deactivated"}, 403
            
        # Проверка 2FA
        if user.two_factor_enabled:
            token = data.get('twofa') or data.get('two_factor_code') or data.get('token')
            if not token:
                return {"message": "2FA required", "two_factor_required": True}, 401
            is_valid, error = AuthService.verify_2fa_token(user.id, token)
            if error or not is_valid:
                return {"message": "Invalid 2FA code", "two_factor_required": True}, 401
                
        # Обновление времени последнего входа
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Генерация токенов
        access_token = create_access_token(
            identity=str(user.id),
            fresh=True,
            expires_delta=timedelta(minutes=15)
        )
        refresh_token = create_refresh_token(
            identity=user.id,
            expires_delta=timedelta(days=30)
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user.to_dict()
        }, 200

class LogoutResource(Resource):
    @jwt_required()
    def post(self):
        jti = get_jwt()["jti"]
        blacklist.add(jti)
        return {"message": "Successfully logged out"}, 200

class RefreshTokenResource(Resource):
    @jwt_required(refresh=True)
    def post(self):
        current_user_id = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user_id, fresh=False)
        return {"access_token": new_access_token}, 200

class GoogleLoginResource(Resource):
    def get(self):
        try:
            # Генерируем уникальное состояние для защиты от CSRF
            state = secrets.token_urlsafe(32)
            
            # Получаем конфигурацию Google OAuth
            google_provider_cfg = requests.get(
                current_app.config['GOOGLE_DISCOVERY_URL']
            ).json()
            authorization_endpoint = google_provider_cfg["authorization_endpoint"]
            
            # Создаем OAuth клиент
            client = WebApplicationClient(current_app.config['GOOGLE_CLIENT_ID'])
            
            # Строим URI для авторизации
            request_uri = client.prepare_request_uri(
                authorization_endpoint,
                redirect_uri=current_app.config['GOOGLE_REDIRECT_URI'],
                scope=["openid", "email", "profile"],
                state=state
            )
            
            # Сохраняем состояние (в production используйте Redis)
            oauth_states[state] = {
                'created_at': datetime.utcnow(),
                'client_id': current_app.config['GOOGLE_CLIENT_ID']
            }
            
            return {"auth_url": request_uri}, 200
            
        except Exception as e:
            return {"message": f"Failed to generate auth URL: {str(e)}"}, 500

class GoogleCallbackResource(Resource):
    def get(self):
        try:
            print("Received Google callback with args:", request.args)
            
            # Проверяем наличие кода авторизации
            code = request.args.get("code")
            state = request.args.get("state")
            error = request.args.get("error")
            
            # Обработка ошибок OAuth
            if error:
                error_description = request.args.get("error_description", "Unknown error")
                return redirect(f"/?error=oauth_error&message={error_description}")
                
            if not code:
                return redirect("/?error=missing_code")
                
            # Проверка состояния для защиты от CSRF
            if not state or state not in oauth_states:
                return redirect("/?error=invalid_state")
                
            # Удаляем использованное состояние
            stored_state = oauth_states.pop(state)
            
            # Проверяем, что состояние не слишком старое (максимум 10 минут)
            if (datetime.utcnow() - stored_state['created_at']).total_seconds() > 600:
                return redirect("/?error=expired_state")
                
            # Получаем конфигурацию Google OAuth
            google_provider_cfg = requests.get(
                current_app.config['GOOGLE_DISCOVERY_URL']
            ).json()
            token_endpoint = google_provider_cfg["token_endpoint"]
            
            # Создаем OAuth клиент
            client = WebApplicationClient(current_app.config['GOOGLE_CLIENT_ID'])
            
            # Подготавливаем запрос на получение токена
            token_url, headers, body = client.prepare_token_request(
                token_endpoint,
                authorization_response=request.url,
                redirect_url=current_app.config['GOOGLE_REDIRECT_URI'],
                code=code
            )
            
            # Получаем токены
            token_response = requests.post(
                token_url,
                headers=headers,
                data=body,
                auth=(
                    current_app.config['GOOGLE_CLIENT_ID'],
                    current_app.config['GOOGLE_CLIENT_SECRET']
                ),
            )
            
            if not token_response.ok:
                return redirect("/?error=token_request_failed")
                
            # Парсим токены
            client.parse_request_body_response(token_response.text)
            
            # Получаем информацию о пользователе
            userinfo_endpoint = google_provider_cfg["userinfo_endpoint"]
            uri, headers, body = client.add_token(userinfo_endpoint)
            userinfo_response = requests.get(uri, headers=headers, data=body)
            
            if not userinfo_response.ok:
                return redirect("/?error=userinfo_request_failed")
                
            userinfo = userinfo_response.json()
            
            # Проверяем верификацию email
            if not userinfo.get("email_verified"):
                return redirect("/?error=email_not_verified")
                
            google_id = userinfo["sub"]
            google_email = userinfo["email"]
            
            # Ищем или создаем пользователя
            user = User.query.filter_by(google_id=google_id).first()
            
            if not user:
                # Проверяем, есть ли пользователь с таким email
                user = User.query.filter_by(email=google_email).first()
                if user:
                    # Связываем существующий аккаунт с Google
                    user.google_id = google_id
                    user.google_email = google_email
                    user.is_verified = True
                else:
                    # Создаем нового пользователя
                    username = google_email.split('@')[0]
                    # Убеждаемся, что username уникален
                    counter = 1
                    original_username = username
                    while User.query.filter_by(username=username).first():
                        username = f"{original_username}{counter}"
                        counter += 1
                        
                    user = User(
                        username=username,
                        email=google_email,
                        google_id=google_id,
                        google_email=google_email,
                        is_verified=True
                    )
                    db.session.add(user)
                    
                db.session.commit()
                
            # Обновляем время последнего входа
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            # Создаем токены
            access_token = create_access_token(
                identity=str(user.id),
                fresh=True,
                expires_delta=timedelta(minutes=15)
            )
            refresh_token = create_refresh_token(
                identity=user.id,
                expires_delta=timedelta(days=30)
            )
            
            # Перенаправляем на dashboard с токенами в URL
            dashboard_url = f"/dashboard.html?access_token={access_token}&refresh_token={refresh_token}"
            return redirect(dashboard_url)
            
        except Exception as e:
            print(f"Google OAuth callback error: {str(e)}")
            return redirect(f"/?error=callback_error&message={str(e)}")
