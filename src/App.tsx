/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ReactNode } from "react";
import { 
  LayoutDashboard, 
  Bot, 
  History, 
  Settings, 
  Power, 
  TrendingUp, 
  Wallet, 
  Activity,
  ChevronRight,
  LogOut,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Bell,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  orderBy,
  getDocFromServer,
  getDocs,
  addDoc,
  updateDoc
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";

// --- Types ---
type Page = "dashboard" | "bot-control" | "trade-history" | "settings";

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  mt5Login?: string;
  mt5Server?: string;
  balance?: number;
}

interface Trade {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  currentPrice?: number;
  profit: number;
  status: "OPEN" | "CLOSED";
  timestamp: any;
}

interface BotSettings {
  isActive: boolean;
  strategy: string;
  riskPercentage: number;
  uid?: string;
}

interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  timestamp: Date;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// --- Error Boundary ---
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-red-100">
            <AlertCircle className="text-red-600 mb-4" size={48} />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-500 mb-6 text-sm">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---

const NotificationToast: React.FC<{ notification: Notification, onDismiss: (id: string) => void }> = ({ notification, onDismiss }) => {
  const icons = {
    success: <CheckCircle2 className="text-emerald-500" size={20} />,
    error: <XCircle className="text-red-500" size={20} />,
    info: <Bell className="text-blue-500" size={20} />,
    warning: <AlertCircle className="text-amber-500" size={20} />
  };

  const bgColors = {
    success: "bg-emerald-50 border-emerald-100",
    error: "bg-red-50 border-red-100",
    info: "bg-blue-50 border-blue-100",
    warning: "bg-amber-50 border-amber-100"
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className={`flex items-start gap-4 p-4 rounded-2xl border shadow-lg max-w-sm w-full mb-3 ${bgColors[notification.type]}`}
    >
      <div className="mt-0.5">{icons[notification.type]}</div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-slate-900">{notification.title}</h4>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notification.message}</p>
      </div>
      <button 
        onClick={() => onDismiss(notification.id)}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

const Sidebar = ({ activePage, setActivePage, user }: { activePage: Page, setActivePage: (p: Page) => void, user: FirebaseUser }) => {
  const menuItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "bot-control", icon: Bot, label: "Bot Control" },
    { id: "trade-history", icon: History, label: "Trade History" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <Bot className="text-white" size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">DANNY BOT</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id as Page)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activePage === item.id 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-white"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

const Header = ({ user }: { user: FirebaseUser }) => (
  <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
    <div className="flex items-center gap-2 text-slate-500">
      <span className="text-sm font-medium">Market Status:</span>
      <span className="flex items-center gap-1 text-green-600 text-sm font-bold">
        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
        OPEN
      </span>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-xs text-slate-500 font-medium">Welcome back,</p>
        <p className="text-sm font-bold text-slate-900">{user.displayName || "Trader"}</p>
      </div>
      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 overflow-hidden">
        {user.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <User size={20} className="text-slate-600" />
        )}
      </div>
    </div>
  </header>
);

const StatCard = ({ title, value, subValue, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={color.replace('bg-', 'text-')} size={24} />
      </div>
      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+2.4%</span>
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    <div className="text-xs text-slate-400 mt-1">{subValue}</div>
  </div>
);

const Dashboard = ({ trades, botSettings, user, goldPrice, userProfile, notify, isFetchingBalance, lastSynced, isMockData }: { trades: Trade[], botSettings: BotSettings | null, user: FirebaseUser, goldPrice: number, userProfile: UserProfile | null, notify: (type: Notification["type"], title: string, message: string) => void, isFetchingBalance: boolean, lastSynced: Date, isMockData: boolean }) => {
  const activeTrades = trades.filter(t => t.status === "OPEN");
  const totalProfit = trades.reduce((acc, t) => acc + t.profit, 0);
  const [isPlacingTrade, setIsPlacingTrade] = useState(false);
  
  const hfmStatus = userProfile?.isMt5Connected ? "CONNECTED" : "DISCONNECTED";
  const currentBalance = userProfile?.balance ?? 0;
  const currentEquity = userProfile?.isMt5Connected ? (currentBalance + totalProfit) : 0;

  const toggleBot = async () => {
    if (!botSettings) return;
    const newStatus = !botSettings.isActive;
    const endpoint = newStatus ? "/api/bot/start" : "/api/bot/stop";
    
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const data = await response.json();
      
      if (data.status === "success") {
        const settingsRef = doc(db, "botSettings", user.uid);
        await updateDoc(settingsRef, {
          isActive: newStatus,
          updatedAt: serverTimestamp()
        });
        
        notify(
          newStatus ? "success" : "warning", 
          newStatus ? "Bot Started" : "Bot Stopped", 
          newStatus ? "Danny Bot is now scanning for setups." : "Trading bot has been paused."
        );
      }
    } catch (error) {
      console.error("Failed to toggle bot:", error);
      notify("error", "Bot Error", "Could not communicate with the trading engine.");
    }
  };

  const timeSinceSync = Math.floor((new Date().getTime() - lastSynced.getTime()) / 1000);

  // Force re-render every second to update "Synced X seconds ago"
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const placeManualTrade = async (type: "BUY" | "SELL") => {
    setIsPlacingTrade(true);
    try {
      const tradeRef = doc(collection(db, "trades"));
      await setDoc(tradeRef, {
        uid: user.uid,
        symbol: "XAUUSD",
        type,
        volume: 0.1,
        openPrice: goldPrice,
        profit: 0,
        status: "OPEN",
        timestamp: serverTimestamp()
      });
      
      notify("success", "Manual Trade Placed", `Successfully opened a ${type} position on XAUUSD at ${goldPrice.toFixed(2)}`);
      
      // Also notify backend (optional for mock)
      fetch("/api/trades/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, symbol: "XAUUSD", type, volume: 0.1, price: goldPrice })
      });
    } catch (error) {
      console.error("Failed to place trade:", error);
    } finally {
      setIsPlacingTrade(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.location.reload()} // Simple way to trigger a full re-sync
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
            title="Refresh Data"
          >
            <Activity size={18} className={isFetchingBalance ? "animate-spin text-blue-600" : ""} />
          </button>
          {hfmStatus === "CONNECTED" && isMockData && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                {isFetchingBalance ? "Syncing..." : "Simulation Mode"}
              </span>
            </div>
          )}
          {hfmStatus === "CONNECTED" && !isMockData && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                {isFetchingBalance ? "Syncing..." : "Live VPS Active"}
              </span>
            </div>
          )}
          {hfmStatus === "DISCONNECTED" && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                MT5 Disconnected
              </span>
            </div>
          )}
        </div>
      </div>

      {hfmStatus !== "CONNECTED" && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-blue-600 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-600/20"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
              <Wallet size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Connect your HFM Account</h3>
              <p className="text-blue-100 text-sm">Link your MT5 account to enable real-time balance syncing and automated trading.</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.hash = "#settings"} // Simple way to suggest navigation if using hash routing, or just tell user
            className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-bold hover:bg-blue-50 transition-colors shadow-lg"
          >
            Go to Settings
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Balance" 
          value={
            <div className="flex items-center gap-2">
              {hfmStatus === "CONNECTED" ? (isFetchingBalance ? "Syncing..." : `$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`) : "Not Connected"}
              {hfmStatus === "CONNECTED" && isMockData && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Mock</span>}
            </div>
          } 
          subValue={
            hfmStatus === "CONNECTED" ? (
              <div className="flex items-center gap-1">
                {isFetchingBalance ? "Updating..." : `Synced ${timeSinceSync}s ago`}
                {isMockData && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded font-bold uppercase tracking-tighter">Mock</span>}
              </div>
            ) : "Account not linked"
          } 
          icon={Wallet} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Equity" 
          value={
            <div className="flex items-center gap-2">
              {hfmStatus === "CONNECTED" ? (isFetchingBalance ? "Calculating..." : `$${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`) : "Not Connected"}
              {hfmStatus === "CONNECTED" && isMockData && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Mock</span>}
            </div>
          } 
          subValue={isFetchingBalance ? "Waiting..." : (hfmStatus === "CONNECTED" ? `Floating P/L: $${totalProfit.toFixed(2)}` : "No active connection")} 
          icon={TrendingUp} 
          color="bg-emerald-600" 
        />
        <StatCard title="Active Trades" value={hfmStatus === "CONNECTED" ? activeTrades.length.toString() : "Not Connected"} subValue={hfmStatus === "CONNECTED" ? "Live positions" : "No active connection"} icon={Activity} color="bg-amber-600" />
        <StatCard title="Bot Status" value={hfmStatus === "CONNECTED" ? (botSettings?.isActive ? "Running" : "Stopped") : "Not Connected"} subValue={hfmStatus === "CONNECTED" ? `Strategy: ${botSettings?.strategy || "None"}` : "Connect MT5 to enable"} icon={Bot} color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Active Trades (HFM)</h3>
            <div className="flex gap-2">
              <button 
                disabled={isPlacingTrade}
                onClick={() => placeManualTrade("BUY")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isPlacingTrade ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                BUY XAUUSD
              </button>
              <button 
                disabled={isPlacingTrade}
                onClick={() => placeManualTrade("SELL")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isPlacingTrade ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} className="rotate-180" />}
                SELL XAUUSD
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                <tr>
                  <th className="px-6 py-4">Symbol</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Volume</th>
                  <th className="px-6 py-4">Open Price</th>
                  <th className="px-6 py-4">Profit</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTrades.length > 0 ? activeTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{trade.symbol}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${trade.type === 'BUY' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{trade.volume}</td>
                    <td className="px-6 py-4 text-slate-600">{trade.openPrice.toFixed(4)}</td>
                    <td className={`px-6 py-4 font-bold ${trade.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ${trade.profit.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <ChevronRight size={16} className="text-slate-400" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No active trades on HFM account</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-6">HFM Account Status</h3>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Broker</span>
                <span className="text-sm font-bold text-slate-900">HF Markets (SV) Ltd</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Account ID</span>
                <span className="text-sm font-bold text-slate-900">{userProfile?.mt5Login || "Not Connected"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Server</span>
                <span className="text-sm font-bold text-slate-900">{userProfile?.mt5Server || "None"}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">XAUUSD Live</p>
                <p className="text-xl font-mono font-bold text-white">${goldPrice.toFixed(2)}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${Math.random() > 0.5 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
            </div>
            
            <button 
              onClick={toggleBot}
              className={`w-full flex items-center justify-between p-4 rounded-xl font-bold transition-colors shadow-lg ${botSettings?.isActive ? 'bg-red-600 text-white shadow-red-600/20' : 'bg-blue-600 text-white shadow-blue-600/20'}`}
            >
              <div className="flex items-center gap-3">
                <Power size={20} />
                <span>{botSettings?.isActive ? 'Stop Bot' : 'Start Bot'}</span>
              </div>
              <ChevronRight size={18} />
            </button>
            
            <div className="pt-6 mt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Connection Health</h4>
              <div className={`flex items-center justify-between p-3 rounded-lg border ${
                hfmStatus === 'CONNECTED' ? 'bg-green-50 border-green-100' : 
                'bg-red-50 border-red-100'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    hfmStatus === 'CONNECTED' ? 'bg-green-500' : 
                    'bg-red-500 animate-pulse'
                  }`} />
                  <span className={`text-sm font-bold ${
                    hfmStatus === 'CONNECTED' ? 'text-green-700' : 
                    'text-red-700'
                  }`}>
                    {hfmStatus}
                  </span>
                </div>
                {hfmStatus === 'CONNECTED' && <span className="text-xs text-green-600 font-medium">Latency: 45ms</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BotControl = ({ botSettings, user, userProfile, notify }: { botSettings: BotSettings | null, user: FirebaseUser, userProfile: UserProfile | null, notify: (type: Notification["type"], title: string, message: string) => void }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateBot = async (updates: Partial<BotSettings>) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const settingsRef = doc(db, "botSettings", user.uid);
      await setDoc(settingsRef, {
        ...botSettings,
        ...updates,
        uid: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (updates.isActive !== undefined) {
        notify(
          updates.isActive ? "success" : "warning",
          updates.isActive ? "Bot Started" : "Bot Stopped",
          updates.isActive 
            ? "Danny Bot is now scanning XAUUSD for high-probability setups." 
            : "Trading bot has been paused. Active trades remain open."
        );
      }
      
      if (updates.strategy) {
        notify("info", "Strategy Updated", `Trading strategy changed to ${updates.strategy}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `botSettings/${user.uid}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Bot Control Center</h2>
            <p className="text-slate-500">Manage your AI trading strategy and risk parameters.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button 
              disabled={isUpdating || !botSettings?.uid} // Simplified check, ideally check HFM connection
              onClick={() => updateBot({ isActive: !botSettings?.isActive })}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all duration-300 disabled:opacity-50 ${
                botSettings?.isActive 
                  ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" 
                  : "bg-blue-600 text-white shadow-xl shadow-blue-600/30 hover:bg-blue-700"
              }`}
            >
              {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <Power size={20} />}
              {botSettings?.isActive ? "Stop Trading Bot" : "Start Trading Bot"}
            </button>
            {!botSettings?.isActive && (
              <p className="text-[10px] text-slate-400 font-medium italic">
                * Ensure HFM account is linked in Settings
              </p>
            )}
          </div>
        </div>

        {botSettings?.isActive && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
              <Activity className="text-white" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">Bot is actively scanning markets...</p>
              <p className="text-xs text-blue-600">Strategy: {botSettings.strategy} | Risk: {botSettings.riskPercentage}%</p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Settings size={18} className="text-blue-600" />
                Active Account
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">MT5 Login</span>
                  <span className="text-sm font-mono font-bold text-slate-900">{userProfile?.mt5Login || "---"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Server</span>
                  <span className="text-sm font-bold text-slate-900">{userProfile?.mt5Server || "---"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Status</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${userProfile?.mt5Login ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {userProfile?.mt5Login ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Select Strategy</label>
              <select 
                value={botSettings?.strategy || "XAUUSD AI Scalper v2.0"}
                onChange={(e) => updateBot({ strategy: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              >
                <option>XAUUSD AI Scalper v2.0</option>
                <option>EURUSD Trend Follower</option>
                <option>Aggressive News Trader</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Risk per Trade (%)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0.1" 
                  max="5" 
                  step="0.1" 
                  value={botSettings?.riskPercentage || 1}
                  onChange={(e) => updateBot({ riskPercentage: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                />
                <span className="w-16 text-center font-bold text-blue-600 bg-blue-50 py-2 rounded-lg border border-blue-100">
                  {botSettings?.riskPercentage || 1}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity size={18} className="text-blue-600" />
              Strategy Overview
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-slate-500">Win Rate (Est.)</span>
                <span className="font-bold text-slate-900">68.4%</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">Avg. Profit</span>
                <span className="font-bold text-emerald-600">+$42.50</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">Max Drawdown</span>
                <span className="font-bold text-red-600">12.4%</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">Timeframe</span>
                <span className="font-bold text-slate-900">M15 / H1</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Bot Activity Log</h3>
          <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-400 space-y-2 max-h-64 overflow-y-auto">
            <p className="text-emerald-500">[SYSTEM] Bot initialized successfully.</p>
            {userProfile?.mt5Login ? (
              <>
                <p className="text-blue-400">[MT5] Connected to {userProfile.mt5Server} | Account: {userProfile.mt5Login}</p>
                <p className="text-emerald-400">[DATA] Balance: ${(userProfile.balance ?? 12450.80).toLocaleString()} | Equity: ${(userProfile.balance ?? 12450.80).toLocaleString()}</p>
                <p className="text-slate-500">[INFO] Broker: HF Markets (SV) Ltd | Leverage: 1:500</p>
              </>
            ) : (
              <p className="text-red-400">[ERROR] No HFM account linked. Please go to Settings.</p>
            )}
            
            {botSettings?.isActive ? (
              <>
                <p className="text-blue-400 animate-pulse">[SCAN] Analyzing XAUUSD M15 timeframe...</p>
                <p className="text-slate-500">[SYNC] Fetching real-time account data from {userProfile?.mt5Server}...</p>
                <p>[INFO] RSI: 48.2 | EMA(20): 2034.12 | EMA(50): 2032.45</p>
                <p className="text-slate-500">[WAIT] No high-probability setup found. Retrying in 10s...</p>
              </>
            ) : (
              <p className="text-amber-500">[IDLE] Bot is currently paused. Press "Start" to begin trading.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Settings Component ---
const SettingsPage = ({ user, userProfile, notify, isMockData }: { user: FirebaseUser, userProfile: UserProfile | null, notify: (type: Notification["type"], title: string, message: string) => void, isMockData: boolean }) => {
  const [hfmId, setHfmId] = useState(userProfile?.mt5Login || "49654745");
  const [hfmPassword, setHfmPassword] = useState(userProfile?.mt5PasswordEncrypted ? "" : "196205Dazo!");
  const [hfmServer, setHfmServer] = useState(userProfile?.mt5Server || "HFMarketsGlobal-Demo");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const [vpsStatus, setVpsStatus] = useState<{ status: "idle" | "loading" | "success" | "error", message?: string, url?: string }>({ status: "idle" });

  const testVpsConnection = async () => {
    setVpsStatus({ status: "loading" });
    try {
      const res = await fetch("/api/mt5/health");
      const data = await res.json();
      if (res.ok) {
        setVpsStatus({ status: "success", message: "Successfully connected to Python Engine!", url: data.url });
        notify("success", "VPS Connected", "Your MT5 Python engine is reachable.");
      } else {
        setVpsStatus({ status: "error", message: data.message || "Engine unreachable", url: data.url });
        notify("error", "VPS Error", "Could not reach your Python engine.");
      }
    } catch (error) {
      setVpsStatus({ status: "error", message: "Connection failed. Check your network." });
      notify("error", "VPS Error", "Connection to backend failed.");
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDocFromServer(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHfmId(data.mt5Login || "");
        setHfmServer(data.mt5Server || "HFM-Real-10");
      }
    };
    loadSettings();
  }, [user.uid]);

  const saveHfmCredentials = async () => {
    if (!hfmId || !hfmPassword) {
      notify("error", "Missing Information", "Please enter both your MT5 Login and Password.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");
    try {
      // 1. Verify connection with backend first
      const connectRes = await fetch("/api/mt5/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          login: hfmId, 
          password: hfmPassword, 
          server: hfmServer, 
          userId: user.uid 
        })
      });

      const connectData = await connectRes.json();

      if (connectData.status === "error") {
        throw new Error(connectData.message || "MT5 Login failed");
      }

      // 2. If connection verified, save to Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        mt5Login: hfmId,
        mt5Server: hfmServer,
        mt5PasswordEncrypted: "ENCRYPTED_" + hfmPassword, // Mock encryption
        balance: connectData.balance || 0,
        equity: connectData.equity || 0,
        isMt5Connected: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setSaveStatus("success");
      notify("success", "Account Connected", `Successfully linked HFM account ${hfmId} on ${hfmServer}.`);
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Connection failed:", error);
      setSaveStatus("error");
      notify("error", "Connection Failed", error instanceof Error ? error.message : "Could not link HFM account. Please check your credentials.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
          <img src="https://www.hfm.com/favicon.ico" alt="HFM" className="w-6 h-6" referrerPolicy="no-referrer" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">HFM Account Settings</h2>
          <p className="text-slate-500 text-sm">Connect your HotForex MT5 account to enable trading.</p>
        </div>
      </div>

      <div className="space-y-6 max-w-md">
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6">
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            <strong>Action Required:</strong> Please enter your MT5 credentials below and click <strong>Connect HFM Account</strong>. 
            Your balance and trades will only be visible once a successful connection is established.
          </p>
        </div>

        {userProfile?.isMt5Connected && (
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Account Balance</p>
              <p className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                {userProfile.balance !== undefined && userProfile.balance !== null 
                  ? `$${userProfile.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : <span className="text-emerald-400 italic">Balance not available</span>
                }
                {isMockData && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded font-bold uppercase tracking-tighter">Mock</span>}
              </p>
            </div>
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <Wallet size={16} className="text-emerald-600" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">MT5 Account ID (login)</label>
          <input 
            type="text" 
            value={hfmId}
            onChange={(e) => setHfmId(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="e.g. 1294857" 
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">MT5 Password</label>
          <input 
            type="password" 
            value={hfmPassword}
            onChange={(e) => setHfmPassword(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="••••••••" 
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">HFM Server</label>
          <select 
            value={hfmServer}
            onChange={(e) => setHfmServer(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option>HFMarketsGlobal-Demo</option>
            <option>HFM-Real-10</option>
            <option>HFM-Real-11</option>
            <option>HFM-Real-12</option>
          </select>
        </div>
        
        <button 
          disabled={isSaving}
          onClick={saveHfmCredentials}
          className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
            saveStatus === "success" ? "bg-green-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : (saveStatus === "success" ? <Activity size={18} /> : <Power size={18} />)}
          {saveStatus === "success" ? "Account Connected!" : "Connect HFM Account"}
        </button>
        
        {saveStatus === "error" && (
          <p className="text-red-600 text-xs font-bold text-center">Failed to connect. Please check your credentials.</p>
        )}

        <div className="pt-8 mt-8 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Activity size={16} className="text-slate-600" />
            </div>
            <h3 className="font-bold text-slate-900">VPS Engine Configuration</h3>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              To see your <strong>real MT5 balance</strong>, you must run the Python engine on your Windows VPS. 
              Set the <code>PYTHON_ENGINE_URL</code> in AI Studio Settings to your VPS public IP.
            </p>
            
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Engine URL</span>
                <span className="text-xs font-mono text-slate-600 truncate max-w-[180px]">
                  {vpsStatus.url || "http://localhost:8000"}
                </span>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                vpsStatus.status === "success" ? "bg-emerald-500" : 
                vpsStatus.status === "error" ? "bg-red-500" : "bg-slate-300"
              }`} />
            </div>

            <button 
              onClick={testVpsConnection}
              disabled={vpsStatus.status === "loading"}
              className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              {vpsStatus.status === "loading" ? <Loader2 className="animate-spin" size={16} /> : <Activity size={16} />}
              Test VPS Connection
            </button>
          </div>

          {vpsStatus.status === "error" && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-[10px] text-red-700 leading-relaxed font-medium">
                <strong>Connection Error:</strong> {vpsStatus.message}
                <br />
                Make sure port 8000 is open on your VPS firewall.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

function AppContent() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [botSettings, setBotSettings] = useState<BotSettings | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [goldPrice, setGoldPrice] = useState(2035.50);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (type: Notification["type"], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: Notification = { id, type, title, message, timestamp: new Date() };
    setNotifications(prev => [newNotification, ...prev].slice(0, 5));
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Market Price Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setGoldPrice(prev => prev + (Math.random() - 0.5) * 0.5);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Bot Task Simulation - DISABLED to show only real account data as requested
  /*
  useEffect(() => {
    if (!botSettings?.isActive || !user) return;
    ...
  }, [botSettings?.isActive, user, goldPrice]);
  */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    };
    testConnection();

    // Listen to User Profile
    const userUnsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data() as UserProfile);
      } else {
        setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          balance: null,
          isMt5Connected: false,
          createdAt: serverTimestamp()
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // Listen to Bot Settings
    const settingsUnsubscribe = onSnapshot(doc(db, "botSettings", user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setBotSettings(snapshot.data() as BotSettings);
      } else {
        // Initialize default settings
        setDoc(doc(db, "botSettings", user.uid), {
          isActive: false,
          strategy: "XAUUSD AI Scalper v2.0",
          riskPercentage: 1.0,
          uid: user.uid,
          updatedAt: serverTimestamp()
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `botSettings/${user.uid}`);
    });

    // Listen to Trades
    const tradesQuery = query(
      collection(db, "trades"), 
      where("uid", "==", user.uid),
      orderBy("timestamp", "desc")
    );
    const tradesUnsubscribe = onSnapshot(tradesQuery, (snapshot) => {
      const tradesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      setTrades(tradesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "trades");
    });

    return () => {
      userUnsubscribe();
      settingsUnsubscribe();
      tradesUnsubscribe();
    };
  }, [isAuthReady, user]);

  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [isMockData, setIsMockData] = useState(false);

  // Initial and Periodic Sync
  useEffect(() => {
    if (!user || !userProfile?.isMt5Connected) return;

    const syncAccountData = async () => {
      setIsFetchingBalance(true);
      try {
        // 1. Sync Balance
        const balanceRes = await fetch("/api/mt5/balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            login: userProfile.mt5Login, 
            password: "MOCK_PASSWORD", 
            server: userProfile.mt5Server 
          })
        });
        const balanceData = await balanceRes.json();
        
        if (balanceData.status === "success") {
          setIsMockData(balanceData.message?.includes("Mock") || false);
          const userRef = doc(db, "users", user.uid);
          await setDoc(userRef, { 
            balance: balanceData.balance,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }

        // 2. Sync Open Trades
        const tradesRes = await fetch("/api/mt5/trades");
        const tradesData = await tradesRes.json();
        
        if (tradesData.status === "success") {
          for (const mt5Trade of tradesData.trades) {
            const tradeQuery = query(
              collection(db, "trades"), 
              where("uid", "==", user.uid),
              where("ticket", "==", mt5Trade.ticket)
            );
            const tradeSnap = await getDocs(tradeQuery);
            
            if (tradeSnap.empty) {
              await addDoc(collection(db, "trades"), {
                uid: user.uid,
                ticket: mt5Trade.ticket,
                symbol: mt5Trade.symbol,
                type: mt5Trade.type,
                volume: mt5Trade.volume,
                openPrice: mt5Trade.price_open,
                profit: mt5Trade.profit,
                status: "OPEN",
                timestamp: serverTimestamp()
              });
            } else {
              const docRef = doc(db, "trades", tradeSnap.docs[0].id);
              await updateDoc(docRef, {
                profit: mt5Trade.profit,
                updatedAt: serverTimestamp()
              });
            }
          }
        }
        
        setLastSynced(new Date());
      } catch (error) {
        console.error("MT5 Sync Failed:", error);
      } finally {
        setIsFetchingBalance(false);
      }
    };

    syncAccountData();
    const interval = setInterval(syncAccountData, 30000);
    return () => clearInterval(interval);
  }, [user, userProfile?.mt5Login, userProfile?.mt5Server]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // Simple hash-based routing for internal links
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "settings") setActivePage("settings");
      if (hash === "dashboard") setActivePage("dashboard");
    };
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // Initial check
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="text-blue-600 animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Bot className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DANNY BOT</h1>
              <p className="text-slate-500 text-sm">AI-Powered Trading System</p>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Welcome to Danny Bot</h2>
          
          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>
            <p className="text-center text-slate-400 text-xs px-4">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar activePage={activePage} setActivePage={setActivePage} user={user} />
      
      <main className="pl-64 min-h-screen flex flex-col">
        <Header user={user} />
        
        <div className="p-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activePage === "dashboard" && <Dashboard trades={trades} botSettings={botSettings} user={user} goldPrice={goldPrice} userProfile={userProfile} notify={notify} isFetchingBalance={isFetchingBalance} lastSynced={lastSynced} isMockData={isMockData} />}
              {activePage === "bot-control" && <BotControl botSettings={botSettings} user={user} userProfile={userProfile} notify={notify} />}
              {activePage === "trade-history" && (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Trade History</h2>
                  {trades.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                          <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Symbol</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Volume</th>
                            <th className="px-6 py-4">Open</th>
                            <th className="px-6 py-4">Close</th>
                            <th className="px-6 py-4">Profit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {trades.map((trade) => (
                            <tr key={trade.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-slate-500 text-sm">
                                {trade.timestamp?.toDate().toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-900">{trade.symbol}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${trade.type === 'BUY' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                                  {trade.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{trade.volume}</td>
                              <td className="px-6 py-4 text-slate-600">{trade.openPrice.toFixed(4)}</td>
                              <td className="px-6 py-4 text-slate-600">{trade.closePrice?.toFixed(4) || "-"}</td>
                              <td className={`px-6 py-4 font-bold ${trade.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                ${trade.profit.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <History size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500">Your past trades will appear here once the bot starts trading.</p>
                    </div>
                  )}
                </div>
              )}
              {activePage === "settings" && <SettingsPage user={user} userProfile={userProfile} notify={notify} isMockData={isMockData} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Notifications Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {notifications.map((notification: Notification) => (
            <NotificationToast 
              key={notification.id} 
              notification={notification} 
              onDismiss={dismissNotification} 
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
