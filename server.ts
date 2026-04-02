import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import axios from "axios";

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || "http://localhost:8000";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Danny Bot Backend is running" });
  });

  app.get("/api/mt5/health", async (req, res) => {
    try {
      const response = await axios.get(`${PYTHON_ENGINE_URL}/health`, { timeout: 3000 });
      res.json({ ...response.data, url: PYTHON_ENGINE_URL });
    } catch (error) {
      res.status(503).json({ 
        status: "error", 
        message: "Python engine unreachable", 
        url: PYTHON_ENGINE_URL,
        hint: "Ensure your Python engine is running on your VPS and the PYTHON_ENGINE_URL environment variable is set correctly in AI Studio Settings."
      });
    }
  });

  // MT5 Trades via Python Engine
  app.get("/api/mt5/trades", async (req, res) => {
    try {
      const response = await axios.get(`${PYTHON_ENGINE_URL}/mt5/trades`, { timeout: 5000 });
      res.json(response.data);
    } catch (error) {
      console.warn("[MT5] Python engine unreachable, falling back to mock trades.");
      // Provide some mock trades for the preview environment
      res.json({ 
        status: "success", 
        trades: [
          {
            ticket: 1234567,
            symbol: "XAUUSD",
            type: "BUY",
            volume: 0.1,
            price_open: 2035.50,
            price_current: 2036.10,
            profit: 6.00,
            comment: "Mock Trade"
          },
          {
            ticket: 1234568,
            symbol: "XAUUSD",
            type: "SELL",
            volume: 0.05,
            price_open: 2036.00,
            price_current: 2035.80,
            profit: 1.00,
            comment: "Mock Trade"
          }
        ] 
      });
    }
  });

  // Bot Control via Python Engine
  app.post("/api/bot/start", async (req, res) => {
    try {
      const response = await axios.post(`${PYTHON_ENGINE_URL}/bot/start`, {}, { timeout: 5000 });
      res.json(response.data);
    } catch (error) {
      console.warn("[BOT] Python engine unreachable, falling back to mock start.");
      res.json({ status: "success", message: "Bot started (Mock)" });
    }
  });

  app.post("/api/bot/stop", async (req, res) => {
    try {
      const response = await axios.post(`${PYTHON_ENGINE_URL}/bot/stop`, {}, { timeout: 5000 });
      res.json(response.data);
    } catch (error) {
      console.warn("[BOT] Python engine unreachable, falling back to mock stop.");
      res.json({ status: "success", message: "Bot stopped (Mock)" });
    }
  });

  app.get("/api/bot/status", async (req, res) => {
    try {
      const response = await axios.get(`${PYTHON_ENGINE_URL}/bot/status`, { timeout: 5000 });
      res.json(response.data);
    } catch (error) {
      res.json({ status: "success", running: false });
    }
  });

  // MT5 Balance via Python Engine
  app.post("/api/mt5/balance", async (req, res) => {
    const { login, password, server } = req.body;
    console.log(`[MT5] Fetching balance for ${login} on ${server}`);

    try {
      const response = await axios.post(`${PYTHON_ENGINE_URL}/mt5/balance`, {
        login,
        password,
        server
      }, { timeout: 5000 });
      
      res.json(response.data);
    } catch (error) {
      console.warn("⚠️ [MT5] Python engine unreachable at " + PYTHON_ENGINE_URL);
      console.warn("👉 To see real balance, deploy to VPS and set PYTHON_ENGINE_URL in AIS Settings.");
      res.json({ 
        status: "success", 
        balance: 10000.00, 
        equity: 10000.00,
        currency: "USD",
        login: login || "49654745",
        message: `Connected via AIS Mock Bridge (Simulating Account ${login || "49654745"})`
      });
    }
  });

  // MT5 Connection via Python Engine
  app.post("/api/mt5/connect", async (req, res) => {
    const { login, password, server } = req.body;
    console.log(`[MT5] Attempting connection for ${login} on ${server}`);

    try {
      // Attempt to call the Python FastAPI engine
      const response = await axios.post(`${PYTHON_ENGINE_URL}/connect`, {
        login,
        password,
        server
      }, { timeout: 5000 });
      
      res.json(response.data);
    } catch (error) {
      console.warn("[MT5] Python engine unreachable, falling back to mock for preview.");
      // Mock fallback for AIS preview environment
      res.json({ 
        status: "success", 
        balance: 12450.80, 
        equity: 12450.80,
        server,
        login,
        message: "Connected via AIS Mock Bridge" 
      });
    }
  });

  // Place Trade via Python Engine
  app.post("/api/trades/place", async (req, res) => {
    const { uid, symbol, type, volume, price } = req.body;
    console.log(`[TRADE] Placing ${type} for ${uid}: ${volume} ${symbol} @ ${price}`);
    
    try {
      const response = await axios.post(`${PYTHON_ENGINE_URL}/trade`, {
        symbol,
        volume,
        type,
        price
      }, { timeout: 5000 });
      
      res.json(response.data);
    } catch (error) {
      console.warn("[TRADE] Python engine unreachable, falling back to mock.");
      res.json({ 
        success: true, 
        message: "Order executed via AIS Mock Bridge",
        trade: {
          symbol,
          type,
          volume,
          openPrice: price,
          status: "OPEN",
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
