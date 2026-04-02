import MetaTrader5 as mt5

def get_account_balance(login, password, server):
    # Initialize MT5
    if not mt5.initialize():
        return {"status": "error", "message": "MT5 initialization failed"}

    # Login
    authorized = mt5.login(int(login), password=password, server=server)

    if not authorized:
        return {"status": "error", "message": "Login failed"}

    # Get account info
    account_info = mt5.account_info()

    if account_info is None:
        return {"status": "error", "message": "Failed to get account info"}

    return {
        "status": "success",
        "balance": account_info.balance,
        "equity": account_info.equity,
        "currency": account_info.currency
    }

def get_open_trades():
    if not mt5.initialize():
        return {"status": "error", "message": "MT5 initialization failed"}
    
    positions = mt5.positions_get()
    if positions is None:
        return {"status": "error", "message": "No positions found or error"}
    
    trades = []
    for p in positions:
        trades.append({
            "ticket": p.ticket,
            "symbol": p.symbol,
            "type": "BUY" if p.type == mt5.ORDER_TYPE_BUY else "SELL",
            "volume": p.volume,
            "price_open": p.price_open,
            "price_current": p.price_current,
            "profit": p.profit,
            "comment": p.comment
        })
    
    return {"status": "success", "trades": trades}
