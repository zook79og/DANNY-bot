import React, { useState } from "react";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { Bot, Send, Loader2, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DannyAssistantProps {
  userProfile: any;
  trades: any[];
}

export const DannyAssistant: React.FC<DannyAssistantProps> = ({ userProfile, trades }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;

    setIsThinking(true);
    setResponse(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `
              You are Danny Bot's AI Market Analyst. 
              User Profile: ${JSON.stringify(userProfile)}
              Current Open Trades: ${JSON.stringify(trades.filter(t => t.status === "OPEN"))}
              
              User Question: ${query}
              
              Provide a detailed, high-level market analysis and advice based on the user's current positions and the general market state.
            ` }]
          }
        ],
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH
          }
        }
      });

      const result = await model;
      setResponse(result.text || "I couldn't generate a response at this time.");
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setResponse("Sorry, I encountered an error while analyzing the markets. Please try again later.");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition-all z-50 group"
      >
        <Bot size={28} className="group-hover:scale-110 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Assistant Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="p-6 bg-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Danny AI Analyst</h3>
                    <p className="text-blue-100 text-xs">Powered by Gemini 3.1 Pro (High Thinking)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!response && !isThinking && (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                      <Bot size={32} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900">How can I help you today?</h4>
                      <p className="text-slate-500 text-sm max-w-xs mx-auto">
                        Ask me about market trends, your current positions, or for strategic advice.
                      </p>
                    </div>
                  </div>
                )}

                {isThinking && (
                  <div className="space-y-4 py-8">
                    <div className="flex items-center justify-center gap-3 text-blue-600">
                      <Loader2 size={24} className="animate-spin" />
                      <span className="font-medium animate-pulse">Analyzing market data...</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden max-w-xs mx-auto">
                      <motion.div 
                        className="h-full bg-blue-600"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 10, ease: "linear", repeat: Infinity }}
                      />
                    </div>
                  </div>
                )}

                {response && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="prose prose-slate max-w-none"
                  >
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {response}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAsk()}
                    placeholder="Ask Danny AI..."
                    className="w-full pl-6 pr-14 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    disabled={isThinking}
                  />
                  <button
                    onClick={handleAsk}
                    disabled={isThinking || !query.trim()}
                    className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
