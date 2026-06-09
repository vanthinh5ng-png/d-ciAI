import { useState, useRef, useEffect } from 'react';
import { Camera, X, UploadCloud, ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store';
import imageCompression from 'browser-image-compression';

export default function CameraScan() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useStore();
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  // Dọn dẹp bộ nhớ URL khi component unmount hoặc đổi ảnh mới
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Xử lý sự kiện khi chọn hoặc chụp ảnh từ thiết bị
  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Tạo nhanh ảnh preview để người dùng thấy ngay lập tức
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
      setResults(null);
      setCompressing(true);

      try {
        // CẤU HÌNH MỚI: Ép hẳn xuống 0.35MB (350KB) - Giúp upload nhanh như chớp qua 4G
        const options = {
          maxSizeMB: 0.35,
          maxWidthOrHeight: 1024, // 1024px là độ phân giải vàng để AI đọc văn bản cực nhanh
          useWebWorker: true 
        };
        const compressedFile = await imageCompression(file, options);
        setImage(compressedFile);
      } catch (error) {
        console.error("Lỗi nén ảnh:", error);
        setImage(file); // Dự phòng nếu lỗi thì dùng ảnh gốc
      } finally {
        setCompressing(false);
      }
    }
  };

  // Hàm xóa ảnh hiện tại để chọn lại ảnh khác
  const handleClear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
    setResults(null);
  };

  // Gửi ảnh lên server xử lý OCR
  const processImage = async () => {
    if (!image) {
      toast.error('Vui lòng đợi ảnh tối ưu xong trong giây lát.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', image);

      // Gọi thẳng lên API đã lên đời Gemini của bạn
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to process image');
      const data = await res.json();
      setResults(data);
    } catch (error) {
      toast.error('Có lỗi xảy ra khi quét đơn thuốc.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Lưu danh sách thuốc vào Firestore và tự động đóng màn hình khi thành công
  const handleSave = async () => {
    if (!results || !user) return;
    setLoading(true);
    try {
      const savePromises = results.map(rx => 
        addDoc(collection(db, 'prescriptions'), {
          userId: user.uid,
          name: rx.name || "",
          dosage: rx.dosage || "",
          times: rx.times || [],
          instructions: rx.instructions || "",
          active: true,
          inventoryId: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );

      await Promise.all(savePromises);
      
      // 1. Hiện thông báo xanh xịn sò báo thành công rực rỡ
      toast.success('🎉 Đã tạo lịch nhắc uống thuốc thành công!');
      
      // 2. Chờ hiệu ứng chạy trong 1 giây (1000ms) để người dùng kịp đọc, rồi tự động thoát hẳn
      setTimeout(() => {
        handleClear(); // Tự động xóa ảnh preview và reset trạng thái kết quả cũ
        navigate('/'); // Điều hướng thoát màn hình upload để quay về trang chủ
      }, 1000);

    } catch (error) {
      toast.error('Không thể lưu dữ liệu lịch nhắc.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center select-none overflow-hidden">
      {/* Header thanh công cụ trên cùng */}
      <div className="w-full flex justify-between p-4 z-10 sticky top-0 bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={() => navigate(-1)} className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-colors">
          <ChevronLeft size={24} />
        </button>
        {preview && (
          <button onClick={handleClear} className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-colors">
            <X size={24} />
          </button>
        )}
      </div>

      {/* Vùng nội dung chính */}
      <div className="flex-1 w-full flex items-center justify-center overflow-y-auto px-4 pb-32">
        {!preview ? (
          <div className="w-full max-w-sm text-center space-y-6 px-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer p-10 border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-3xl bg-gray-900/30 transition-all flex flex-col items-center justify-center gap-3 active:scale-98"
            >
              <div className="p-4 bg-gray-800/50 rounded-2xl group-hover:bg-blue-600/10 group-hover:text-blue-500 text-gray-400 transition-colors">
                <UploadCloud size={40} />
              </div>
              <div>
                <p className="text-gray-200 font-semibold text-base">Tải đơn thuốc của bạn lên</p>
                <p className="text-gray-500 text-xs mt-1">Hỗ trợ ảnh chụp (.jpg, .png) từ thiết bị</p>
              </div>
            </div>

            <div className="flex items-center my-4 text-gray-600 text-sm">
              <div className="flex-1 border-t border-gray-800"></div>
              <span className="px-3">Hoặc</span>
              <div className="flex-1 border-t border-gray-800"></div>
            </div>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 px-5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-2xl flex items-center justify-center gap-2 border border-white/10 transition-colors active:scale-98"
            >
              <Camera size={20} />
              Chụp ảnh / Mở thư viện
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md flex flex-col items-center gap-5 py-4">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gray-900/50">
              <img src={preview} alt="Preview" className="max-h-[35vh] w-auto object-contain mx-auto" />
              {compressing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-white text-xs gap-2">
                  <Loader2 className="animate-spin size-4" /> Đang tối ưu dung lượng ảnh...
                </div>
              )}
            </div>
            
            {results && (
              <div className="w-full bg-white rounded-2xl p-4 shadow-xl space-y-3">
                <h3 className="font-semibold text-gray-800 border-b pb-2 text-sm">Kết quả phân tích</h3>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                  {results.map((rx, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-1.5">
                      <input className="font-medium text-blue-600 bg-transparent border-none outline-none w-full text-sm" defaultValue={rx.name} />
                      <div className="flex gap-2">
                        <input className="text-xs bg-white border border-gray-200 px-2 py-1.5 rounded w-1/3" defaultValue={rx.dosage} />
                        <input className="text-xs bg-white border border-gray-200 px-2 py-1.5 rounded w-2/3" defaultValue={rx.times?.join(", ")} />
                      </div>
                      <input className="text-xs text-gray-500 bg-transparent border-none outline-none w-full mt-0.5" defaultValue={rx.instructions} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thanh công cụ cố định ở đáy màn hình */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe bg-gradient-to-t from-black via-black/90 to-transparent flex justify-center items-center z-20">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleCapture}
        />
        
        {preview && (
          <button 
            onClick={!results ? processImage : handleSave}
            disabled={loading || compressing}
            className={`w-full max-w-sm font-medium py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-white shadow-lg transform active:scale-98 disabled:opacity-40 disabled:pointer-events-none ${
              !results 
                ? "bg-blue-600 hover:bg-blue-700 shadow-blue-900/30" 
                : "bg-green-600 hover:bg-green-700 shadow-green-900/30"
            }`}
          >
            {loading && <Loader2 className="animate-spin size-5" />}
            {!results 
              ? (loading ? "Đang xử lý bằng AI..." : (compressing ? "Đang chuẩn bị ảnh..." : "Phân tích đơn thuốc")) 
              : (loading ? "Đang tạo lịch..." : "Tạo lịch uống thuốc")
            }
          </button>
        )}
      </div>
    </div>
  );
}