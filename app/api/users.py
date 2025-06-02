from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app import db

class UserResource(Resource):
    @jwt_required()
    def get(self, user_id):
        current_user_id = get_jwt_identity()
        print(f"DEBUG: current_user_id={current_user_id} ({type(current_user_id).__name__}), user_id={user_id} ({type(user_id).__name__})")
        
        if str(current_user_id) != str(user_id):
            print(f"DEBUG: Access denied!")
            return {"message": "Access denied"}, 403
        
        print(f"DEBUG: Access granted!")
        user = User.query.get_or_404(user_id)
        return user.to_dict(), 200

    @jwt_required()
    def put(self, user_id):
        current_user_id = get_jwt_identity()
        if str(current_user_id) != str(user_id):
            return {"message": "Access denied"}, 403

        user = User.query.get_or_404(user_id)
        data = request.get_json()

        # Смена пароля
        if 'password' in data and data['password']:
            if 'current_password' not in data or not user.check_password(data['current_password']):
                return {"message": "Неверный текущий пароль"}, 400
            user.set_password(data['password'])

        # Остальные поля (пример)
        if 'email' in data:
            user.email = data['email']
        if 'two_factor_enabled' in data:
            user.two_factor_enabled = data['two_factor_enabled']

        db.session.commit()
        return user.to_dict(), 200

class UserListResource(Resource):
    @jwt_required()
    def get(self):
        # В реальном API нужны права администратора
        # Это упрощенная версия
        current_user_id = get_jwt_identity()
        users = User.query.all()
        return [user.to_dict() for user in users], 200
