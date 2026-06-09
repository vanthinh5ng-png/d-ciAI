import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Pill } from 'lucide-react';

export default function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mb-8">
        <Pill className="text-blue-600" size={40} />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center mb-2">MediSync</h1>
      <p className="text-gray-500 text-center mb-12">Trợ lý nhắc nhở uống thuốc & Theo dõi sức khỏe thông minh.</p>
      
      <button 
        onClick={handleLogin}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-2xl transition-colors shadow-lg shadow-blue-200"
      >
        Đăng nhập bằng Google
      </button>
    </div>
  );
}
