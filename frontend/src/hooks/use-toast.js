// Re-export toast from sonner for compatibility
import { toast } from 'sonner';

export { toast };

export const useToast = () => {
  return {
    toast
  };
};