from flask import Blueprint
from flask_restful import Api
from app.api.auth import Setup2FAResource, Verify2FAResource
from app.api.wallets import WalletDepositResource, WalletWithdrawResource, WalletTransactionsResource

api_bp = Blueprint('api', __name__)
api = Api(api_bp)

# Импорт ресурсов
from app.api.auth import (
    RegisterResource, LoginResource, LogoutResource, RefreshTokenResource,
    GoogleLoginResource, GoogleCallbackResource, MeResource  # Добавлено
)
from app.api.users import UserResource, UserListResource
from app.api.wallets import WalletResource, WalletListResource
from app.api.orders import OrderResource, OrderListResource, OrderBookResource
from app.api.market import MarketDataResource, TickerResource
from app.api.notifications import (
    NotificationResource, NotificationListResource, NotificationMarkAllReadResource
)
from app.api.orders import CancelOrderResource
from app.api.market import PriceHistoryResource

# Регистрация маршрутов аутентификации
api.add_resource(RegisterResource, '/auth/register')
api.add_resource(LoginResource, '/auth/login')
api.add_resource(LogoutResource, '/auth/logout')
api.add_resource(RefreshTokenResource, '/auth/refresh')
api.add_resource(GoogleLoginResource, '/auth/google/login')
api.add_resource(GoogleCallbackResource, '/oauth2/callback')
api.add_resource(MeResource, '/auth/me')  # Добавлено

# Регистрация маршрутов пользователей
api.add_resource(UserResource, '/users/<int:user_id>')
api.add_resource(UserListResource, '/users')

# Регистрация маршрутов кошельков
api.add_resource(WalletResource, '/wallets/<int:wallet_id>')
api.add_resource(WalletListResource, '/wallets')

# Регистрация маршрутов ордеров
api.add_resource(OrderResource, '/orders/<int:order_id>')
api.add_resource(OrderListResource, '/orders')
api.add_resource(OrderBookResource, '/orderbook/<string:market_pair>')

# Регистрация маршрутов рыночных данных
api.add_resource(MarketDataResource, '/market/<string:market_pair>')
api.add_resource(TickerResource, '/ticker/<string:market_pair>')

api.add_resource(Setup2FAResource, '/auth/2fa/setup')
api.add_resource(Verify2FAResource, '/auth/2fa/verify')

api.add_resource(WalletDepositResource, '/wallets/<int:wallet_id>/deposit')
api.add_resource(WalletWithdrawResource, '/wallets/<int:wallet_id>/withdraw')
api.add_resource(WalletTransactionsResource, '/wallets/<int:wallet_id>/transactions')

api.add_resource(NotificationResource, '/notifications/<int:notification_id>')
api.add_resource(NotificationListResource, '/notifications')
api.add_resource(NotificationMarkAllReadResource, '/notifications/mark-all-read')

api.add_resource(CancelOrderResource, '/orders/<int:order_id>/cancel')
api.add_resource(PriceHistoryResource, '/market-history/<string:market_pair>')
