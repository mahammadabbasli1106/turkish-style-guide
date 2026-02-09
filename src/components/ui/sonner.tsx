import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const TOAST_DURATION = 1000;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  // Dismiss all toasts when clicking anywhere outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-sonner-toast]")) {
        sonnerToast.dismiss();
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      style={{ bottom: "6rem" }}
      duration={Infinity}
      toastOptions={{
        style: {
          position: "relative" as const,
          overflow: "hidden",
        },
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

// Wrap all toast methods to auto-dismiss after TOAST_DURATION
function withAutoDismiss<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    const id = fn(...args);
    setTimeout(() => {
      sonnerToast.dismiss(id);
    }, TOAST_DURATION);
    return id;
  }) as T;
}

const toast = Object.assign(withAutoDismiss(sonnerToast), {
  success: withAutoDismiss(sonnerToast.success),
  error: withAutoDismiss(sonnerToast.error),
  info: withAutoDismiss(sonnerToast.info),
  warning: withAutoDismiss(sonnerToast.warning),
  loading: sonnerToast.loading,
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
  message: withAutoDismiss(sonnerToast.message),
  custom: withAutoDismiss(sonnerToast.custom),
});

export { Toaster, toast, TOAST_DURATION };
