from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.order import Order, OrderType, OrderStatus
from app.services.order_service import OrderService
from app import db
from app.models.wallet import Wallet
import traceback
from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.order import Order, OrderType, OrderStatus
from app.models.wallet import Wallet
from app import db
import traceback

class OrderResource(Resource):
    @jwt_required()
    def get(self, order_id):
        """Получение конкретного ордера по его ID"""
        try:
            order = Order.query.get_or_404(order_id)
            
            # Получаем ID пользователя из токена
            current_user_id = get_jwt_identity()
            if isinstance(current_user_id, str):
                current_user_id = int(current_user_id)

            # Проверка владения ордером
            if order.user_id != current_user_id:
                return {"message": "Access denied"}, 403
            
            # Создаем словарь вручную, чтобы избежать проблем с сериализацией
            result = {
                'id': order.id,
                'user_id': order.user_id,
                'base_currency': order.base_currency,
                'quote_currency': order.quote_currency,
                'pair': f"{order.base_currency}/{order.quote_currency}",
                'type': order.order_type,
                'price': float(order.price) if order.price else None,
                'amount': float(order.amount),
                'filled_amount': float(order.filled_amount) if order.filled_amount else 0.0,
                'status': order.status,
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'updated_at': order.updated_at.isoformat() if order.updated_at else None
            }
            return result, 200
            
        except Exception as e:
            print(f"ERROR in OrderResource.get: {str(e)}")
            traceback.print_exc()
            return {"message": "Error occurred while fetching order."}, 500

    @jwt_required()
    def delete(self, order_id):
        """Отмена ордера по его ID"""
        try:
            current_user_id = get_jwt_identity()
            if isinstance(current_user_id, str):
                current_user_id = int(current_user_id)

            order = Order.query.get_or_404(order_id)

            # Проверка владения ордером
            if order.user_id != current_user_id:
                return {"message": "Access denied"}, 403
            
            # Проверка возможности отмены
            if order.status == OrderStatus.FILLED:
                return {"message": "Cannot cancel filled order"}, 400
                
            if order.status == OrderStatus.CANCELLED:
                return {"message": "Order is already cancelled"}, 400
            
            # Отмена ордера
            order.status = OrderStatus.CANCELLED
            
            # Возврат средств
            if order.order_type == OrderType.BUY:
                wallet = Wallet.query.filter_by(user_id=current_user_id, currency=order.quote_currency).first()
                if wallet:
                    refund_amount = (order.amount - order.filled_amount) * order.price
                    wallet.balance += refund_amount
            else:  # SELL
                wallet = Wallet.query.filter_by(user_id=current_user_id, currency=order.base_currency).first()
                if wallet:
                    refund_amount = order.amount - order.filled_amount
                    wallet.balance += refund_amount
            
            db.session.commit()
            return {"message": "Order cancelled successfully"}, 200
        except Exception as e:
            print(f"ERROR in OrderResource.delete: {str(e)}")
            traceback.print_exc()
            return {"message": "Error occurred while cancelling order."}, 500

class OrderListResource(Resource):
    @jwt_required()
    def get(self):
        """Получение списка ордеров текущего пользователя"""
        current_user_id = get_jwt_identity()
        if isinstance(current_user_id, str):
            current_user_id = int(current_user_id)

        # Параметры фильтрации
        status = request.args.get('status')
        pair = request.args.get('pair')

        # Базовый запрос
        query = Order.query.filter_by(user_id=current_user_id)

        # Применение фильтров
        if status:
            query = query.filter_by(status=status)
        if pair:
            base, quote = pair.split('/')
            query = query.filter_by(base_currency=base, quote_currency=quote)

        # Сортировка и получение результатов
        orders = query.order_by(Order.created_at.desc()).all()
        
        return [order.to_dict() for order in orders], 200
        
    @jwt_required()
    def post(self):
        """Создание нового ордера"""
        current_user_id = get_jwt_identity()
        if isinstance(current_user_id, str):
            current_user_id = int(current_user_id)

        data = request.get_json()
        required_fields = ['base_currency', 'quote_currency', 'type', 'amount']
        if not all(field in data for field in required_fields):
            return {"message": "Missing required fields"}, 400
            
        if data['type'] not in [OrderType.BUY, OrderType.SELL]:
            return {"message": "Invalid order type"}, 400
            
        # Для лимитных ордеров необходима цена
        if 'price' not in data:
            return {"message": "Price is required for limit orders"}, 400
            
        # Создание ордера через сервис
        order, error = OrderService.create_order(
            user_id=current_user_id,
            base_currency=data['base_currency'],
            quote_currency=data['quote_currency'],
            order_type=data['type'],
            amount=data['amount'],
            price=data['price']
        )
        
        if error:
            return {"message": error}, 400
            
        return order.to_dict(), 201

class CancelOrderResource(Resource):
    @jwt_required()
    def post(self, order_id):
        try:
            print(f"DEBUG: Attempting to cancel order {order_id}")
            current_user_id = get_jwt_identity()
            
            # Преобразование типов для корректного сравнения
            if isinstance(current_user_id, str):
                try:
                    current_user_id = int(current_user_id)
                except ValueError:
                    pass
            
            print(f"DEBUG: User ID: {current_user_id}, Order ID: {order_id}")
            
            # Проверка существования ордера
            order = Order.query.get_or_404(order_id)
            print(f"DEBUG: Found order. Status: {order.status}, User ID: {order.user_id}")
            
            # Проверка владения ордером
            if order.user_id != current_user_id:
                print(f"DEBUG: Order user_id {order.user_id} does not match current_user_id {current_user_id}")
                return {"message": "Access denied"}, 403
                
            # Проверка возможности отмены
            if order.status == OrderStatus.FILLED:
                return {"message": "Cannot cancel filled order"}, 400
                
            if order.status == OrderStatus.CANCELLED:
                return {"message": "Order is already cancelled"}, 400
            
            # Отмена ордера
            order.status = OrderStatus.CANCELLED
            
            # Возврат средств (пример реализации)
            if order.order_type == OrderType.BUY:
                # Для ордера покупки возвращаем quote_currency (например, USDT)
                wallet = Wallet.query.filter_by(user_id=current_user_id, currency=order.quote_currency).first()
                if wallet:
                    refund_amount = (order.amount - order.filled_amount) * order.price
                    wallet.balance += refund_amount
            else:  # SELL
                # Для ордера продажи возвращаем base_currency (например, BTC)
                wallet = Wallet.query.filter_by(user_id=current_user_id, currency=order.base_currency).first()
                if wallet:
                    refund_amount = order.amount - order.filled_amount
                    wallet.balance += refund_amount
            
            db.session.commit()
            print(f"DEBUG: Order {order_id} cancelled successfully")
            
            return {"message": "Order cancelled successfully"}, 200
        except Exception as e:
            print(f"ERROR in OrderResource.delete: {str(e)}")
            import traceback
            traceback.print_exc()

class OrderListResource(Resource):
    @jwt_required()
    def get(self):
        """Получение списка ордеров текущего пользователя"""
        current_user_id = get_jwt_identity()
        if isinstance(current_user_id, str):
            current_user_id = int(current_user_id)

        # Параметры фильтрации
        status = request.args.get('status')
        pair = request.args.get('pair')

        # Базовый запрос
        query = Order.query.filter_by(user_id=current_user_id)

        # Применение фильтров
        if status:
            query = query.filter_by(status=status)
        if pair:
            base, quote = pair.split('/')
            query = query.filter_by(base_currency=base, quote_currency=quote)

        # Сортировка и получение результатов
        orders = query.order_by(Order.created_at.desc()).all()
        
        return [order.to_dict() for order in orders], 200
        
    @jwt_required()
    def post(self):
        """Создание нового ордера"""
        current_user_id = get_jwt_identity()
        if isinstance(current_user_id, str):
            current_user_id = int(current_user_id)

        data = request.get_json()
        required_fields = ['base_currency', 'quote_currency', 'type', 'amount']
        if not all(field in data for field in required_fields):
            return {"message": "Missing required fields"}, 400
            
        if data['type'] not in [OrderType.BUY, OrderType.SELL]:
            return {"message": "Invalid order type"}, 400
            
        if 'price' not in data:
            return {"message": "Price is required for limit orders"}, 400
            
        # Создание ордера через сервис
        order, error = OrderService.create_order(
            user_id=current_user_id,
            base_currency=data['base_currency'],
            quote_currency=data['quote_currency'],
            order_type=data['type'],
            amount=data['amount'],
            price=data['price']
        )
        
        if error:
            return {"message": error}, 400
            
        return order.to_dict(), 201

class OrderBookResource(Resource):
    def get(self, market_pair):
        # Разбиваем пару на базовую и котируемую валюты
        try:
            base, quote = market_pair.split('-')
        except ValueError:
            return {"message": "Invalid market pair format. Use BASE-QUOTE (e.g., BTC-USDT)"}, 400
            
        # Получаем активные ордера на покупку (bid)
        bids = Order.query.filter_by(
            base_currency=base,
            quote_currency=quote,
            order_type=OrderType.BUY,
            status=OrderStatus.PENDING
        ).order_by(Order.price.desc()).limit(50).all()
        
        # Получаем активные ордера на продажу (ask)
        asks = Order.query.filter_by(
            base_currency=base,
            quote_currency=quote, 
            order_type=OrderType.SELL,
            status=OrderStatus.PENDING
        ).order_by(Order.price.asc()).limit(50).all()
        
        # Форматируем данные для ответа
        bid_data = [{"price": order.price, "amount": order.amount - order.filled_amount} for order in bids]
        ask_data = [{"price": order.price, "amount": order.amount - order.filled_amount} for order in asks]
        
        return {
            "market": market_pair,
            "bids": bid_data,
            "asks": ask_data,
            "timestamp": int(__import__('time').time())
        }, 200
