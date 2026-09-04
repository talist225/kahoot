import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-white text-kahoot-purple hover:bg-gray-100',
  danger: 'bg-kahoot-red text-white hover:bg-red-700',
  success: 'bg-kahoot-green text-white hover:bg-green-700',
  secondary: 'bg-kahoot-purple-light text-white hover:bg-purple-600',
  blue: 'bg-kahoot-blue text-white hover:bg-blue-700',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-lg',
  lg: 'px-8 py-4 text-xl',
  xl: 'px-10 py-5 text-2xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
}) {
  return (
    <motion.button
      type={type}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      className={`${variants[variant]} ${sizes[size]} font-bold rounded-lg shadow-lg 
        transition-colors duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
