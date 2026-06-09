import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; // Thêm hàm đăng xuất của Firebase
import { db, auth } from '../lib/firebase'; // Đảm bảo đã export auth từ file firebase
import { useStore } from '../store';
import { CheckCircle2, Circle, Clock, LogOut } from 'lucide-react'; // Thêm icon LogOut
import { useNavigate } from 'react-router'; // Dùng để chuyển trang sau khi thoát
import clsx from 'clsx';
import { toast } from 'sonner';

interface Prescription {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  instructions: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tối ưu: Khởi tạo state từ localStorage để tải lại trang không bị mất dấu tích đã uống thuốc
  const [taken, setTaken] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('medisync_taken_history');
    return saved ? JSON.parse(saved) : {};
  });

  // Tự động lưu trạng thái uống thuốc mỗi khi có thay đổi
  useEffect(() => {
    localStorage.setItem('medisync_taken_history', JSON.stringify(taken));
  }, [taken]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'prescriptions'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Prescription[];
      setPrescriptions(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Hàm xử lý đăng xuất tài khoản
  const handleLogout = async () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất tài khoản không?")) {
      try {
        await signOut(auth);
        toast.success("Đã đăng xuất thành công!");
        navigate('/login'); // Đá người dùng về trang đăng nhập
      } catch (error) {
        console.error("Lỗi đăng xuất:", error);
        toast.error("Không thể đăng xuất, vui lòng thử lại.");
      }
    }
  };

  const toggleStatus = (id: string, time: string) => {
    const key = `${id}-${time}`;
    setTaken(prev => {
       const isTaken = !prev[key];
       if (isTaken) toast.success("Đã đánh dấu uống thuốc!");
       return { ...prev, [key]: isTaken };
    });
  };

  const timeSlots = ["Sáng", "Trưa", "Chiều", "Tối"];

  return (
    <div className="p-6 pt-12 pb-24">
      {/* Header khu vực lời chào và các nút tương tác */}
      <div className="flex justify-between items-start mb-6">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-gray-900">
             Xin chào, {user?.displayName?.split(' ')[0] || "bạn"}! 👋
           </h1>
           <p className="text-sm text-gray-500 mt-1">Hôm nay bạn đã uống thuốc đầy đủ chưa?</p>
        </div>
        
        {/* Khối Avatar & Nút đăng xuất xếp cạnh nhau */}
        <div className="flex items-center gap-3">
          {user?.photoURL && (
            <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200" />
          )}
          <button 
            onClick={handleLogout}
            className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors active:scale-95"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-2xl w-full"></div>
          <div className="h-24 bg-gray-200 rounded-2xl w-full"></div>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-300">
             <Clock size={28} />
          </div>
          <p className="text-gray-500 text-center text-sm">Chưa có lịch uống thuốc nào.<br/>Nhấn nút Scan để thêm ngay.</p>
        </div>
      ) : (
        <div className="space-y-8 relative">
           <div className="absolute left-6 top-8 bottom-0 w-px bg-gray-200 -z-10"></div>
           {timeSlots.map(time => {
              const items = prescriptions.filter(p => p.times?.some(t => t.toLowerCase().includes(time.toLowerCase())));
              if (items.length === 0) return null;

              return (
                 <div key={time} className="relative">
                    <div className="flex items-center gap-4 mb-3">
                       <div className="w-12 text-sm font-semibold text-gray-400 text-right">{time}</div>
                       <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm shadow-blue-200 shrink-0"></div>
                    </div>
                    <div className="pl-16 space-y-3">
                       {items.map(item => {
                          const key = `${item.id}-${time}`;
                          const isTaken = taken[key];
                          return (
                             <div 
                                key={key} 
                                onClick={() => toggleStatus(item.id, time)}
                                className={clsx(
                                   "bg-white rounded-2xl p-4 shadow-sm border flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer",
                                   isTaken ? "border-green-200 bg-green-50/50" : "border-gray-100"
                                )}
                             >
                                <div className="flex flex-col gap-1">
                                   <span className={clsx("font-semibold text-gray-900", isTaken && "line-through text-gray-400")}>{item.name}</span>
                                   <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{item.dosage}</span>
                                      {item.instructions && <span>• {item.instructions}</span>}
                                   </div>
                                </div>
                                <div className={clsx("w-6 h-6 shrink-0 transition-colors", isTaken ? "text-green-500" : "text-gray-300")}>
                                   {isTaken ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </div>
              );
           })}
        </div>
      )}
    </div>
  );
}