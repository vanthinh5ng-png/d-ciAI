import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store';
import { Package, Search, MapPin } from 'lucide-react';

interface InventoryItem {
   id: string;
   name: string;
   quantity: number;
}

export default function Inventory() {
   const { user } = useStore();
   const [items, setItems] = useState<InventoryItem[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (!user) return;
      const load = async () => {
         try {
            const q = query(collection(db, 'inventory'), where('userId', '==', user.uid));
            const snaps = await getDocs(q);
            setItems(snaps.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
         } catch (error) {
            console.error(error);
         } finally {
            setLoading(false);
         }
      };
      load();
   }, [user]);

   return (
      <div className="p-6 pt-12 pb-24">
         <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Tủ thuốc Gia đình</h1>
            <p className="text-sm text-gray-500">Quản lý các loại thuốc có sẵn tại nhà</p>
         </div>

         <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
               type="text" 
               placeholder="Tìm kiếm thuốc trong tủ..." 
               className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-medium"
            />
         </div>

         {loading ? (
            <div className="animate-pulse space-y-3">
               <div className="h-16 bg-gray-200 rounded-xl w-full"></div>
            </div>
         ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-gray-300 flex flex-col items-center text-center space-y-4">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                  <Package size={28} />
               </div>
               <div>
                  <h3 className="font-semibold text-gray-900">Tủ thuốc trống</h3>
                  <p className="text-sm text-gray-500 mb-4">Bạn chưa quét loại thuốc nào để thêm vào tủ</p>
                  <button className="text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">Quét vỏ hộp ngay</button>
               </div>
            </div>
         ) : (
            <div className="space-y-3 mb-8">
               {items.map(item => (
                  <div key={item.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between shadow-sm">
                     <span className="font-semibold text-gray-900">{item.name}</span>
                     <span className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded">Số lượng: {item.quantity}</span>
                  </div>
               ))}
            </div>
         )}

         {/* Hộp gợi ý tìm nhà thuốc */}
         <div className="mt-8 bg-blue-50 rounded-2xl p-5 border border-blue-100">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
               <MapPin size={18} /> Mua thêm thuốc?
            </h3>
            <p className="text-sm text-blue-800/80 mb-4">Gợi ý các nhà thuốc gần khu vực hiện tại của bạn.</p>
            
            {/* THAY ĐỔI Ở ĐÂY: Dùng thẻ <a> trực tiếp với link dạng Universal kết hợp geo để điện thoại tự bắt bài mở app */}
            <a 
               href="https://www.google.com/maps/search/?api=1&query=nhà+thuốc"
               target="_blank"
               rel="noopener noreferrer"
               className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-center text-sm"
            >
               <MapPin size={16} />
               Tìm nhà thuốc quanh đây
            </a>
         </div>
      </div>
   );
}