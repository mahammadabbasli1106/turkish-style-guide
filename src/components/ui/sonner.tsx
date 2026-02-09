import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const TOAST_DURATION = 2000;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <>
      <style>{`
        @keyframes toast-progress-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }

        [data-sonner-toaster] [data-sonner-toast] {
          position: relative !important;
          overflow: hidden !important;
        }

        [data-sonner-toaster] [data-sonner-toast]::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          height: 2px;
          width: 100%;
          background: hsl(var(--foreground));
          animation: toast-progress-shrink ${TOAST_DURATION}ms linear forwards;
          pointer-events: none;
          z-index: 10;
        }

        [data-sonner-toaster] [data-sonner-toast][data-removed='true']::after {
          animation: none;
          opacity: 0;
        }
      `}</style>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        position="top-center"
        style={{ bottom: "6rem" }}
        duration={TOAST_DURATION}
        toastOptions={{
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
    </>
  );
};

export { Toaster, toast };
