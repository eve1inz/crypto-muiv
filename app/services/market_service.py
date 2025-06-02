import requests
import time

class MarketService:
    # Кэш для текущих цен
    _price_cache = {}
    _cache_ttl = 120  # секунд (2 минуты)

    # Кэш для истории
    _history_cache = {}        # (base, quote, days): (history, timestamp)
    _history_cache_ttl = 120   # секунд

    @staticmethod
    def get_external_ticker(base, quote):
        coingecko_ids = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'BNB': 'binancecoin',
            'USDT': 'tether',
            'ADA': 'cardano',
            'SOL': 'solana',
            'XRP': 'ripple',
            'DOT': 'polkadot',
            'DOGE': 'dogecoin',
            'AVAX': 'avalanche-2',
            'MATIC': 'matic-network',
            'LTC': 'litecoin',
            'LINK': 'chainlink',
            'UNI': 'uniswap',
            'ATOM': 'cosmos',
        }
        base_id = coingecko_ids.get(base.upper())
        quote = quote.lower()
        if quote == 'usdt':
            quote = 'usd'
        cache_key = (base.upper(), quote)
        now = time.time()
        cached = MarketService._price_cache.get(cache_key)
        if cached and now - cached[1] < MarketService._cache_ttl:
            return cached[0], None
        if not base_id:
            return None, f"Unsupported base currency: {base}"
        try:
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={base_id}&vs_currencies={quote}"
            resp = requests.get(url, timeout=10)
            if resp.status_code == 429:
                if cached:
                    return cached[0], "Rate limit exceeded, using cached value"
                return None, "Rate limit exceeded and no cached value"
            resp.raise_for_status()
            data = resp.json()
            price = data.get(base_id, {}).get(quote)
            if price is None:
                if cached:
                    return cached[0], "No price in API, using cached value"
                return None, f"No price for {base}/{quote}"
            MarketService._price_cache[cache_key] = (price, now)
            return price, None
        except Exception as e:
            if cached:
                return cached[0], f"API error, using cached value: {e}"
            return None, str(e)

    @staticmethod
    def get_price_history(base, quote, days=1):
        coingecko_ids = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'BNB': 'binancecoin',
            'USDT': 'tether',
            'ADA': 'cardano',
            'SOL': 'solana',
            'XRP': 'ripple',
            'DOT': 'polkadot',
            'DOGE': 'dogecoin',
            'AVAX': 'avalanche-2',
            'MATIC': 'matic-network',
            'LTC': 'litecoin',
            'LINK': 'chainlink',
            'UNI': 'uniswap',
            'ATOM': 'cosmos',
        }
        base_id = coingecko_ids.get(base.upper())
        if not base_id:
            return None, f"Unsupported base currency: {base}"
        if quote.lower() == 'usdt':
            quote = 'usd'
        cache_key = (base.upper(), quote, days)
        now = time.time()
        cached = MarketService._history_cache.get(cache_key)
        if cached and now - cached[1] < MarketService._history_cache_ttl:
            return cached[0], None
        url = f"https://api.coingecko.com/api/v3/coins/{base_id}/market_chart"
        params = {"vs_currency": quote, "days": days}
        try:
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 429:
                if cached:
                    return cached[0], "Rate limit exceeded, using cached value"
                return None, "Rate limit exceeded and no cached value"
            resp.raise_for_status()
            data = resp.json()
            history = []
            for t, p in data.get('prices', []):
                history.append({
                    "time": time.strftime("%Y-%m-%d %H:%M", time.localtime(t // 1000)),
                    "price": p
                })
            MarketService._history_cache[cache_key] = (history, now)
            return history, None
        except Exception as e:
            if cached:
                return cached[0], f"API error, using cached value: {e}"
            return None, str(e)
