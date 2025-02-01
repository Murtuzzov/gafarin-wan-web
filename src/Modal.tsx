import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null; // Если модальное окно не открыто, то ничего не показываем.

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-11/12 sm:w-80 md:w-96 max-w-[80%]">
        <h2 className="text-xl mb-4 text-gray-800">
          Вы действительно хотите загрузить аудио?
        </h2>
        <div className="flex justify-between space-x-4">
          <button
            onClick={onConfirm}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-[10px]"
          >
            Да
          </button>
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-[10px]"
          >
            Нет
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
