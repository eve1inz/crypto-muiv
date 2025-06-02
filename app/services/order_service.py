from app import db
from app.models.order import Order, OrderStatus, OrderType
from app.models.wallet import Wallet
from app.models.transaction import Trade
from datetime import datetime

class OrderService:
    @staticmethod
    def create_order(user_id, base_currency, quote_currency, order_type, amount, price=None):
        """
        Создает новый ордер и проверяет баланс пользователя
        """
        # Проверка баланса кошелька пользователя
        if order_type == OrderType.BUY:
            wallet = Wallet.query.filter_by(user_id=user_id, currency=quote_currency).first()
            required_balance = amount * price if price else amount
        else:  # SELL
            wallet = Wallet.query.filter_by(user_id=user_id, currency=base_currency).first()
            required_balance = amount
            
        if not wallet or wallet.balance < required_balance:
            return None, "Insufficient balance"
            
        # Создание ордера
        order = Order(
            user_id=user_id,
            base_currency=base_currency,
            quote_currency=quote_currency,
            order_type=order_type,
            price=price,
            amount=amount
        )
        
        # Временная блокировка средств (это упрощенная версия)
        wallet.balance -= required_balance
        
        db.session.add(order)
        db.session.commit()
        
        # Запуск процесса согласования ордеров (в реальной системе это будет асинхронно)
        OrderService.match_orders(order)
        
        return order, None
        
    @staticmethod
    def cancel_order(order_id, user_id):
        """
        Отменяет ордер и возвращает средства в кошелек
        """
        order = Order.query.filter_by(id=order_id, user_id=user_id).first()
        
        if not order:
            return None, "Order not found"
            
        if order.status == OrderStatus.FILLED:
            return None, "Order is already filled"
            
        if order.status == OrderStatus.CANCELLED:
            return None, "Order is already cancelled"
            
        # Возвращение средств в кошелек
        if order.order_type == OrderType.BUY:
            wallet = Wallet.query.filter_by(user_id=user_id, currency=order.quote_currency).first()
            refund_amount = (order.amount - order.filled_amount) * order.price
        else:  # SELL
            wallet = Wallet.query.filter_by(user_id=user_id, currency=order.base_currency).first()
            refund_amount = order.amount - order.filled_amount
            
        wallet.balance += refund_amount
        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return order, None
        
    @staticmethod
    def match_orders(new_order):
        """
        Простой алгоритм согласования ордеров (matching engine)
        В реальной бирже это сложный и высокооптимизированный компонент
        """
        if new_order.order_type == OrderType.BUY:
            # Ищем подходящие ордера на продажу (по возрастанию цены)
            potential_matches = Order.query.filter_by(
                base_currency=new_order.base_currency,
                quote_currency=new_order.quote_currency,
                order_type=OrderType.SELL,
                status=OrderStatus.PENDING
            ).filter(Order.price <= new_order.price).order_by(Order.price.asc()).all()
        else:
            # Ищем подходящие ордера на покупку (по убыванию цены)
            potential_matches = Order.query.filter_by(
                base_currency=new_order.base_currency,
                quote_currency=new_order.quote_currency,
                order_type=OrderType.BUY,
                status=OrderStatus.PENDING
            ).filter(Order.price >= new_order.price).order_by(Order.price.desc()).all()
        
        remaining_amount = new_order.amount
        
        for match in potential_matches:
            if remaining_amount <= 0:
                break
                
            available_amount = match.amount - match.filled_amount
            trade_amount = min(remaining_amount, available_amount)
            trade_price = match.price  # Обычно берем цену существующего ордера
            
            # Создаем сделку
            trade = Trade(
                order_id=new_order.id,
                counter_order_id=match.id,
                price=trade_price,
                amount=trade_amount
            )
            
            # Обновляем статусы ордеров
            new_order.filled_amount += trade_amount
            match.filled_amount += trade_amount
            
            if match.filled_amount >= match.amount:
                match.status = OrderStatus.FILLED
                
            remaining_amount -= trade_amount
            
            db.session.add(trade)
            
        if remaining_amount <= 0:
            new_order.status = OrderStatus.FILLED
        elif new_order.filled_amount > 0:
            new_order.status = OrderStatus.PARTIAL
            
        db.session.commit()
        
        return new_order

@staticmethod
def get_order_book(base_currency, quote_currency, limit=50):
    """
    Получает текущий ордербук для заданной торговой пары
    """
    # Ордера на покупку (bid) - сортируем по убыванию цены
    bids = Order.query.filter_by(
        base_currency=base_currency,
        quote_currency=quote_currency,
        order_type=OrderType.BUY,
        status=OrderStatus.PENDING
    ).order_by(Order.price.desc()).limit(limit).all()
    
    # Ордера на продажу (ask) - сортируем по возрастанию цены
    asks = Order.query.filter_by(
        base_currency=base_currency,
        quote_currency=quote_currency,
        order_type=OrderType.SELL,
        status=OrderStatus.PENDING
    ).order_by(Order.price.asc()).limit(limit).all()
    
    # Группируем ордера по цене для создания уровней ордербука
    bid_levels = {}
    for bid in bids:
        price = float(bid.price)
        amount = float(bid.amount - bid.filled_amount)
        if price in bid_levels:
            bid_levels[price] += amount
        else:
            bid_levels[price] = amount
            
    ask_levels = {}
    for ask in asks:
        price = float(ask.price)
        amount = float(ask.amount - ask.filled_amount)
        if price in ask_levels:
            ask_levels[price] += amount
        else:
            ask_levels[price] = amount
            
    # Преобразуем в отсортированные списки для ответа API
    bid_list = [{"price": price, "amount": amount} for price, amount in sorted(bid_levels.items(), reverse=True)]
    ask_list = [{"price": price, "amount": amount} for price, amount in sorted(ask_levels.items())]
    
    return {
        "bids": bid_list,
        "asks": ask_list
    }

@staticmethod
def get_recent_trades(base_currency, quote_currency, limit=50):
    """
    Получает последние сделки для заданной торговой пары
    """
    # Находим ID всех ордеров для данной торговой пары
    pair_orders = Order.query.filter_by(
        base_currency=base_currency,
        quote_currency=quote_currency
    ).with_entities(Order.id).all()
    
    pair_order_ids = [order.id for order in pair_orders]
    
    if not pair_order_ids:
        return []
        
    # Получаем последние сделки, связанные с этими ордерами
    recent_trades = Trade.query.filter(
        (Trade.order_id.in_(pair_order_ids)) | 
        (Trade.counter_order_id.in_(pair_order_ids))
    ).order_by(Trade.created_at.desc()).limit(limit).all()
    
    # Форматируем результаты
    trades = []
    for trade in recent_trades:
        # Получаем информацию о связанных ордерах
        order = Order.query.get(trade.order_id)
        counter_order = Order.query.get(trade.counter_order_id)
        
        # Определяем тип сделки (buy/sell) с точки зрения taker
        # В реальной бирже эта логика будет более сложной
        trade_type = order.order_type
        
        trades.append({
            "id": trade.id,
            "price": trade.price,
            "amount": trade.amount,
            "type": trade_type,
            "timestamp": int(trade.created_at.timestamp()),
            "created_at": trade.created_at.isoformat()
        })
    
    return trades