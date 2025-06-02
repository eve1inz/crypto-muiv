try:
    import pyotp
    import base64
    import io
    import qrcode
except ImportError as e:
    print(f"Missing dependencies for 2FA: {e}")
    print("Install with: pip install pyotp qrcode[pil]")

import requests
from app import db
from app.models.user import User
from flask import current_app

class AuthService:
    @staticmethod
    def generate_2fa_secret(user_id):
        """Генерирует секретный ключ для двухфакторной аутентификации"""
        try:
            user = User.query.get(user_id)
            if not user:
                return None, "User not found"

            # Генерация нового секретного ключа
            secret = pyotp.random_base32()
            user.two_factor_secret = secret
            db.session.commit()

            return secret, None
        except Exception as e:
            return None, f"Error generating 2FA secret: {str(e)}"

    @staticmethod
    def get_2fa_qrcode(user_id, app_name="CryptoExchange"):
        """Генерирует QR-код для настройки 2FA в приложении Authenticator"""
        try:
            user = User.query.get(user_id)
            if not user or not user.two_factor_secret:
                return None, "2FA secret not generated"

            # Создание URI для QR-кода
            totp = pyotp.TOTP(user.two_factor_secret)
            provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name=app_name)

            # Генерация QR-кода
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(provisioning_uri)
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")

            # Преобразование изображения в строку base64
            buffered = io.BytesIO()
            img.save(buffered)
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return f"data:image/png;base64,{img_str}", None
        except Exception as e:
            return None, f"Error generating QR code: {str(e)}"

    @staticmethod
    def verify_2fa_token(user_id, token):
        """Проверяет TOTP токен для 2FA"""
        try:
            user = User.query.get(user_id)
            if not user or not user.two_factor_secret:
                return False, "2FA not set up"

            totp = pyotp.TOTP(user.two_factor_secret)
            return totp.verify(token), None
        except Exception as e:
            return False, f"Error verifying 2FA token: {str(e)}"

    @staticmethod
    def enable_2fa(user_id, token):
        """Включает 2FA для пользователя после верификации токена"""
        try:
            is_valid, error = AuthService.verify_2fa_token(user_id, token)
            
            if error or not is_valid:
                return False, "Invalid verification code"

            user = User.query.get(user_id)
            user.two_factor_enabled = True
            db.session.commit()

            return True, None
        except Exception as e:
            return False, f"Error enabling 2FA: {str(e)}"
