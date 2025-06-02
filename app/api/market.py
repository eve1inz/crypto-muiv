from flask import request
from flask_restful import Resource
from app.models.order import Order, OrderStatus, OrderType
from sqlalchemy import func
from app import db
import time
from app.services.market_service import MarketService

from flask_restful import Resource
from flask import request
from app.services.market_service import MarketService

class PriceHistoryResource(Resource):
    def get(self, market_pair):
        try:
            base, quote = market_pair.split('-')
            days = int(request.args.get('days', 1))
            history, error = MarketService.get_price_history(base, quote, days)
            if error:
                return {"error": error}, 400
            return {"history": history}, 200
        except Exception as e:
            return {"error": str(e)}, 400


class MarketDataResource(Resource):
    def get(self, market_pair):
        # Разбиваем пару на базовую и котируемую валюты
        try:
            base, quote = market_pair.split('-')
        except ValueError:
            return {"message": "Invalid market pair format. Use BASE-QUOTE (e.g., BTC-USDT)"}, 400
            
        # Период для получения данных (по умолчанию 24 часа)
        period = request.args.get('period', '24h')
        
        # Получение последних сделок для формирования OHLC данных
        # В реальной бирже здесь был бы сложный SQL-запрос к таблице сделок
        # Это упрощенная реализация
        
        # Заглушка с фиктивными данными
        market_data = {
            "market": market_pair,
            "period": period,
            "open": 19000.0,
            "high": 19500.0,
            "low": 18800.0,
            "close": 19200.0,
            "volume": 128.45,
            "timestamp": int(time.time())
        }
        
        return market_data, 200

class TickerResource(Resource):
    def get(self, market_pair):
        # Разбиваем пару на базовую и котируемую валюты
        try:
            base, quote = market_pair.split('-')
        except ValueError:
            return {"message": "Invalid market pair format. Use BASE-QUOTE (e.g., BTC-USDT)"}, 400

        # Сначала пробуем получить цену с CoinGecko
        price, error = MarketService.get_external_ticker(base, quote)
        if price is not None:
            ticker_data = {
                "symbol": market_pair,
                "last_price": price,
                "bid": price,  # Для простоты, можно доработать
                "ask": price,
                "24h_change": None,  # Можно доработать через внешний API
                "24h_high": None,
                "24h_low": None,
                "24h_volume": None,
                "timestamp": int(time.time())
            }
            return ticker_data, 200

        # Fallback: внутренние данные
        best_bid = db.session.query(func.max(Order.price)).filter(
            Order.base_currency == base,
            Order.quote_currency == quote,
            Order.order_type == OrderType.BUY,
            Order.status == OrderStatus.PENDING
        ).scalar() or 0
        
        # Получаем лучшую цену продажи (lowest ask)
        best_ask = db.session.query(func.min(Order.price)).filter(
            Order.base_currency == base,
            Order.quote_currency == quote,
            Order.order_type == OrderType.SELL,
            Order.status == OrderStatus.PENDING
        ).scalar() or 0
        
        # Заглушка для остальных данных
        ticker_data = {
            "symbol": market_pair,
            "bid": best_bid,
            "ask": best_ask,
            "last_price": (best_bid + best_ask) / 2 if best_bid and best_ask else 19200.0,
            "24h_change": 2.5,  # процент изменения за 24 часа
            "24h_high": 19500.0,
            "24h_low": 18800.0,
            "24h_volume": 128.45,
            "timestamp": int(time.time())
        }
        
        return ticker_data, 200
