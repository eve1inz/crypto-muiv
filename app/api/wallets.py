from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.wallet import Wallet
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app import db
import uuid
import time

class WalletDepositResource(Resource):
    @jwt_required()
    def post(self, wallet_id):
        """Эндпоинт для пополнения кошелька."""
        current_user_id = get_jwt_identity()
        
        # Преобразование ID пользователя из строки в число, если это необходимо
        if isinstance(current_user_id, str):
            current_user_id = int(current_user_id)

        # Получаем кошелек по ID
        wallet = Wallet.query.get_or_404(wallet_id)

        # Проверка владения кошельком
        if wallet.user_id != current_user_id:
            return {"message": "Access denied"}, 403

        data = request.get_json()
        if not data or 'amount' not in data:
            return {"message": "Amount is required"}, 400

        amount = float(data['amount'])
        if amount <= 0:
            return {"message": "Amount must be positive"}, 400

        # Создание транзакции пополнения
        tx_hash = f"DEP{int(time.time())}{uuid.uuid4().hex[:8]}"

        transaction = Transaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.DEPOSIT,
            amount=amount,
            fee=0.0,  # Без комиссии для этого примера
            status=TransactionStatus.COMPLETED,
            tx_hash=tx_hash
        )

        # Обновление баланса кошелька
        wallet.balance += amount

        db.session.add(transaction)
        db.session.commit()

        return {
            "message": "Deposit successful",
            "transaction": transaction.to_dict()
        }, 200


class WalletWithdrawResource(Resource):
    @jwt_required()
    def post(self, wallet_id):
        """Эндпоинт для вывода средств из кошелька."""
        current_user_id = get_jwt_identity()
        if isinstance(current_user_id, str):
            try:
                current_user_id = int(current_user_id)
            except ValueError:
                return {"message": "Invalid user ID"}, 400
        wallet = Wallet.query.get_or_404(wallet_id)

        # Проверка владения кошельком
        if wallet.user_id != current_user_id:
            return {"message": "Access denied"}, 403

        data = request.get_json()
        if not data or 'amount' not in data or 'address' not in data:
            return {"message": "Amount and address are required"}, 400

        amount = float(data['amount'])
        address = data['address']

        # Проверка суммы
        if amount <= 0:
            return {"message": "Amount must be positive"}, 400

        # Расчет комиссии (пример)
        fee = amount * 0.001  # 0.1%
        total_amount = amount + fee

        # Проверка баланса
        if wallet.balance < total_amount:
            return {"message": "Insufficient balance"}, 400

        # Создание транзакции вывода
        tx_hash = f"WD{int(time.time())}{uuid.uuid4().hex[:8]}"

        transaction = Transaction.query.filter_by(wallet_id=wallet.id, transaction_type=TransactionType.WITHDRAWAL, status=TransactionStatus.PENDING).first()
        
        # Проверка, есть ли уже активная транзакция на вывод
        if transaction:
            return {"message": "There is already a pending withdrawal request"}, 400

        transaction = Transaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.WITHDRAWAL,
            amount=amount,
            fee=fee,
            status=TransactionStatus.PENDING,  # Начальный статус
            tx_hash=tx_hash
        )

        # Обновление баланса кошелька
        wallet.balance -= total_amount

        db.session.add(transaction)
        db.session.commit()

        return {
            "message": "Withdrawal request submitted",
            "transaction": transaction.to_dict()
        }, 200



class WalletTransactionsResource(Resource):
    @jwt_required()
    def get(self, wallet_id):
        """Получение истории транзакций по кошельку."""
        current_user_id = get_jwt_identity()
        print(f"DEBUG: transaction request: user_id={current_user_id}, wallet_id={wallet_id}")
        
        # Убедимся, что типы данных совпадают
        if isinstance(current_user_id, str):
            current_user_id = int(current_user_id)
        wallet_id = int(wallet_id)
        
        wallet = Wallet.query.get_or_404(wallet_id)
        
        print(f"DEBUG: wallet check: wallet.user_id={wallet.user_id}, current_user_id={current_user_id}")
        
        # Проверка владения кошельком
        if wallet.user_id != current_user_id:
            print(f"DEBUG: Access denied to wallet {wallet_id} for user {current_user_id}")
            return {"message": "Access denied"}, 403

            
        # Параметры пагинации
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Получение транзакций с пагинацией
        transactions = Transaction.query.filter_by(wallet_id=wallet.id)\
            .order_by(Transaction.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
            
        return {
            "transactions": [tx.to_dict() for tx in transactions.items],
            "pagination": {
                "total": transactions.total,
                "pages": transactions.pages,
                "current_page": page,
                "per_page": per_page
            }
        }, 200


class WalletResource(Resource):
    @jwt_required()
    def get(self, wallet_id):
        wallet = Wallet.query.get_or_404(wallet_id)
        
        # Проверка владения кошельком
        current_user_id = get_jwt_identity()
        if isinstance(current_user_id, str):
            current_user_id = int(current_user_id)
        
        if wallet.user_id != current_user_id:
            return {"message": "Access denied"}, 403
            
        return wallet.to_dict(), 200


class WalletListResource(Resource):
    @jwt_required()
    def get(self):
        """Получение списка кошельков текущего пользователя."""
        current_user_id = get_jwt_identity()
        if isinstance(current_user_id, str):
            current_user_id = int(current_user_id)
        
        wallets = Wallet.query.filter_by(user_id=current_user_id).all()
        return [wallet.to_dict() for wallet in wallets], 200
    
    @jwt_required()
    def post(self):
        """Создание нового кошелька."""
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        if current_user_id is not None:
            current_user_id = int(current_user_id)

        if not data or 'currency' not in data:
            return {"message": "Currency is required"}, 400
            
        # Проверка существования кошелька для данной валюты
        existing_wallet = Wallet.query.filter_by(
            user_id=current_user_id,
            currency=data['currency']
        ).first()
        
        if existing_wallet:
            return {"message": f"Wallet for {data['currency']} already exists"}, 400
            
        # Создание адреса кошелька
        wallet_address = str(uuid.uuid4())
        
        wallet = Wallet(
            user_id=current_user_id,
            currency=data['currency'],
            balance=0.0,
            address=wallet_address
        )
        
        db.session.add(wallet)
        db.session.commit()
        
        return wallet.to_dict(), 201
