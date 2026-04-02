import MetaTrader5 as mt5
from trade_executor import place_trade
from data import get_data
import pandas as pd
import pandas_ta as ta

def run_strategy(symbol="XAUUSD", risk_pct=1.0):
    rates = get_data(symbol)
    if rates is None:
        return {"status": "error", "message": "Failed to get market data"}
        
    df = pd.DataFrame(rates)
    df['rsi'] = ta.rsi(df['close'], length=14)
    df['ema20'] = ta.ema(df['close'], length=20)
    
    last_row = df.iloc[-1]
    rsi = last_row['rsi']
    ema = last_row['ema20']
    price = last_row['close']
    
    # Simple Scalping Logic
    if price > ema and rsi < 30:
        # BUY Logic
        result = place_trade(symbol, 0.01, mt5.ORDER_TYPE_BUY)
        return {"status": "success", "action": "BUY", "result": str(result)}
    elif price < ema and rsi > 70:
        # SELL Logic
        result = place_trade(symbol, 0.01, mt5.ORDER_TYPE_SELL)
        return {"status": "success", "action": "SELL", "result": str(result)}
        
    return {"status": "idle", "message": "No setup found"}
