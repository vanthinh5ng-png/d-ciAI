import { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store';
import { Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import Markdown from 'react-markdown';

export default function Chatbot() {
  const { user } = useStore();
  const [messages, setMessages] = useState([{ role: "assistant", text: "Xin chào! Tôi có thể giúp gì cho bạn về các loại thuốc bạn đang dùng?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      // Gather context
      const q = query(collection(db, 'prescriptions'), where('userId', '==', user.uid));
      const snaps = await getDocs(q);
      const dbContext = snaps.docs.map(d => d.data());

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context: dbContext })
      });
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", text: "Xin lỗi, đã xảy ra lỗi khi cố gắng phản hồi." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] bg-gray-50">
      <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
          <Bot size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Trợ lý Y tế AI</h2>
          <p className="text-xs text-gray-500">Sẵn sàng giải đáp thắc mắc</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={clsx("flex gap-3 max-w-[85%]", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}>
            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", msg.role === "user" ? "bg-gray-200 text-gray-600" : "bg-blue-100 text-blue-600")}>
              {msg.role === "user" ? <UserIcon size={16} /> : <Bot size={16} />}
            </div>
            <div className={clsx("rounded-2xl p-3 text-sm shadow-sm", msg.role === "user" ? "bg-blue-600 text-white" : "bg-white text-gray-800 border border-gray-100")}>
              {msg.role === "assistant" ? (
                <div className="markdown-body prose prose-sm prose-p:leading-relaxed">
                  <Markdown>{msg.text}</Markdown>
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600"><Bot size={16} /></div>
            <div className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" size={16} /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSend} className="flex gap-2 bg-gray-50 p-1 rounded-full border border-gray-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none px-4 text-sm"
            placeholder="Hỏi về tác dụng phụ, cách dùng..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button disabled={!input.trim() || loading} type="submit" className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 transition-colors">
             <Send size={18} className="translate-x-[1px] translate-y-[1px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
