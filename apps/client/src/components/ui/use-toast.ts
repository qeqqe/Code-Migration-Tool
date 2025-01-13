import { toast as sonnerToast } from 'sonner';

export const toast = {
  default: (props: { title: string; description?: string }) =>
    sonnerToast(props.title, { description: props.description }),
  error: (props: { title: string; description?: string }) =>
    sonnerToast.error(props.title, { description: props.description }),
  success: (props: { title: string; description?: string }) =>
    sonnerToast.success(props.title, { description: props.description }),
};

export type Toast = typeof toast;
