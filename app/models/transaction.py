from app import db
from datetime import datetime

class TransactionType:
    DEPOSIT = 'deposit'
    WITHDRAWAL = 'withdrawal'
    TRADE = 'trade'

class TransactionStatus:
    PENDING = 'pending'
    COMPLETED = 'completed'
    FAILED = 'failed'

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    wallet_id = db.Column(db.Integer, db.ForeignKey('wallets.id'), nullable=False)
    transaction_type = db.Column(db.String(10), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    fee = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(10), default=TransactionStatus.PENDING)
    tx_hash = db.Column(db.String(128))  # Хеш транзакции в блокчейне
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'wallet_id': self.wallet_id,
            'type': self.transaction_type,
            'amount': self.amount,
            'fee': self.fee,
            'status': self.status,
            'tx_hash': self.tx_hash,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Trade(db.Model):
    __tablename__ = 'trades'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    counter_order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    price = db.Column(db.Float, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
