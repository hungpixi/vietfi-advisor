'use client';
import { motion } from 'framer-motion';

interface Props {
  onClick: () => void;
}

export default function FAB({ onClick }: Props) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-primary rounded-full shadow-xl
                 flex items-center justify-center text-2xl text-black font-bold z-50"
      style={{ boxShadow: '0 4px 20px rgba(255, 215, 0, 0.4)' }}
    >
      +
    </motion.button>
  );
}
