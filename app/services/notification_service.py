from app import db
from app.models.notification import Notification, NotificationType

class NotificationService:
    @staticmethod
    def create_notification(user_id, notification_type, title, message):
        """Создает новое уведомление для пользователя"""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message
        )
        
        db.session.add(notification)
        db.session.commit()
        
        return notification
        
    @staticmethod
    def get_user_notifications(user_id, page=1, per_page=20, unread_only=False):
        """Получает список уведомлений пользователя с пагинацией"""
        query = Notification.query.filter_by(user_id=user_id)
        
        if unread_only:
            query = query.filter_by(is_read=False)
            
        return query.order_by(Notification.created_at.desc())\
                   .paginate(page=page, per_page=per_page, error_out=False)
                   
    @staticmethod
    def mark_as_read(notification_id, user_id):
        """Отмечает уведомление как прочитанное"""
        notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
        
        if not notification:
            return None, "Notification not found"
            
        notification.is_read = True
        db.session.commit()
        
        return notification, None
        
    @staticmethod
    def mark_all_as_read(user_id):
        """Отмечает все уведомления пользователя как прочитанные"""
        Notification.query.filter_by(user_id=user_id, is_read=False)\
                         .update({Notification.is_read: True})
        db.session.commit()
        
        return True, None
