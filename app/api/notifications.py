from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.notification_service import NotificationService

class NotificationResource(Resource):
    @jwt_required()
    def get(self, notification_id):
        """Получение конкретного уведомления"""
        current_user_id = get_jwt_identity()
        
        # Ищем уведомление в базе и проверяем права доступа
        notification, error = NotificationService.mark_as_read(notification_id, current_user_id)
        
        if error:
            return {"message": error}, 404
            
        return notification.to_dict(), 200

class NotificationListResource(Resource):
    @jwt_required()
    def get(self):
        """Получение списка уведомлений пользователя"""
        current_user_id = get_jwt_identity()
        
        # Параметры запроса
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        unread_only = request.args.get('unread', 'false').lower() == 'true'
        
        # Получение уведомлений
        notifications = NotificationService.get_user_notifications(
            current_user_id, 
            page=page, 
            per_page=per_page, 
            unread_only=unread_only
        )
        
        return {
            "notifications": [n.to_dict() for n in notifications.items],
            "pagination": {
                "total": notifications.total,
                "pages": notifications.pages,
                "current_page": page,
                "per_page": per_page
            }
        }, 200

class NotificationMarkAllReadResource(Resource):
    @jwt_required()
    def post(self):
        """Отмечает все уведомления пользователя как прочитанные"""
        current_user_id = get_jwt_identity()
        
        success, error = NotificationService.mark_all_as_read(current_user_id)
        
        if error:
            return {"message": error}, 400
            
        return {"message": "All notifications marked as read"}, 200
