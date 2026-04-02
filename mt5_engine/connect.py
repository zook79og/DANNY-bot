import MetaTrader5 as mt5

def connect_mt5(login, password, server):
    if not mt5.initialize():
        return {"status": "error", "message": "MT5 initialization failed"}

    authorized = mt5.login(login=int(login), password=password, server=server)

    if authorized:
        account_info = mt5.account_info()
        return {
            "status": "success",
            "balance": account_info.balance,
            "equity": account_info.equity,
            "server": server,
            "login": login
        }
    else:
        return {"status": "error", "message": "Login failed"}
