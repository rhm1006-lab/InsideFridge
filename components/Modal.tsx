
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  children?: React.ReactNode;
  onClose: () => void;
  title: string;
  zIndexClass?: string;
  maxWidthClass?: string;
}

export const Modal = ({ children, onClose, title, zIndexClass = "z-50", maxWidthClass = "max-w-lg" }: ModalProps) => (
  <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 ${zIndexClass}`}>
    <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidthClass} max-h-[90vh] overflow-hidden animate-fade-in flex flex-col`}>
      <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <X className="w-6 h-6 text-gray-500" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
        {children}
      </div>
    </div>
  </div>
);
