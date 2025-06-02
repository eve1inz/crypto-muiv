from app import db
from datetime import datetime

class OrderType:
    BUY = 'buy'
    SELL = 'sell'

class OrderStatus:
    PENDING = 'pending'
    PARTIAL = 'partial'
    FILLED = 'filled'
    CANCELLED = 'cancelled'

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Торговая пара
    base_currency = db.Column(db.String(10), nullable=False)  # Базовая валюта (BTC в паре BTC/USDT)
    quote_currency = db.Column(db.String(10), nullable=False)  # Котируемая валюта (USDT в паре BTC/USDT)
    
    order_type = db.Column(db.String(10), nullable=False)  # buy, sell
    price = db.Column(db.Float)  # Null для рыночных ордеров
    amount = db.Column(db.Float, nullable=False)  # Количество базовой валюты
    filled_amount = db.Column(db.Float, default=0.0)  # Исполненное количество
    status = db.Column(db.String(10), default=OrderStatus.PENDING)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    trades = db.relationship('Trade', backref='order', lazy='dynamic', foreign_keys='[Trade.order_id]')
    counter_trades = db.relationship('Trade', backref='counter_order', lazy='dynamic', foreign_keys='[Trade.counter_order_id]')

    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'pair': f"{self.base_currency}/{self.quote_currency}",
            'type': self.order_type,
            'price': self.price,
            'amount': self.amount,
            'filled_amount': self.filled_amount,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
