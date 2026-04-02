import MetaTrader5 as mt5

def get_data(symbol="XAUUSD", timeframe=mt5.TIMEFRAME_M15):
    if not mt5.initialize():
        mt5.initialize()
    
    rates = mt5.copy_rates_from_pos(symbol, timeframe, 0, 100)
    return rates
