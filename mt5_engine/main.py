from fastapi import FastAPI
from mt5_service import get_account_balance, get_open_trades
import uvicorn
import asyncio

app = FastAPI()
bot_running = False

@app.get("/health")
def health_check():
    return {"status": "ok", "engine": "MT5 Python Engine"}

@app.post("/mt5/balance")
def fetch_balance(data: dict):
    return get_account_balance(
        data["login"],
        data["password"],
        data["server"]
    )

@app.get("/mt5/trades")
def fetch_trades():
    return get_open_trades()

@app.post("/bot/start")
async def start_bot():
    global bot_running
    bot_running = True
    # In a real app, this would trigger the trading loop in a background task
    return {"status": "success", "message": "Bot started"}

@app.post("/bot/stop")
async def stop_bot():
    global bot_running
    bot_running = False
    return {"status": "success", "message": "Bot stopped"}

@app.get("/bot/status")
def get_bot_status():
    return {"status": "success", "running": bot_running}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
