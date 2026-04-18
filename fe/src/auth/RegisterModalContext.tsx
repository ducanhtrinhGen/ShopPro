import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

export type OpenRegisterModalOptions = {
  /** Runs after successful registration; modal is closed first. */
  onSuccess?: () => void | Promise<void>;
};

type RegisterModalContextValue = {
  isOpen: boolean;
  openRegisterModal: (options?: OpenRegisterModalOptions) => void;
  closeRegisterModal: () => void;
  /** Called by RegisterModal after auth succeeds; runs pending `onSuccess` then clears it. */
  completeRegisterSuccess: () => Promise<void>;
};

const RegisterModalContext = createContext<RegisterModalContextValue | undefined>(undefined);

export function RegisterModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pendingOnSuccessRef = useRef<(() => void | Promise<void>) | null>(null);

  const closeRegisterModal = useCallback(() => {
    setIsOpen(false);
    pendingOnSuccessRef.current = null;
  }, []);

  const openRegisterModal = useCallback((options?: OpenRegisterModalOptions) => {
    pendingOnSuccessRef.current = options?.onSuccess ?? null;
    setIsOpen(true);
  }, []);

  const completeRegisterSuccess = useCallback(async () => {
    const fn = pendingOnSuccessRef.current;
    pendingOnSuccessRef.current = null;
    setIsOpen(false);
    if (fn) {
      await fn();
    }
  }, []);

  const value = useMemo<RegisterModalContextValue>(
    () => ({
      isOpen,
      openRegisterModal,
      closeRegisterModal,
      completeRegisterSuccess
    }),
    [isOpen, openRegisterModal, closeRegisterModal, completeRegisterSuccess]
  );

  return <RegisterModalContext.Provider value={value}>{children}</RegisterModalContext.Provider>;
}

export function useRegisterModal() {
  const ctx = useContext(RegisterModalContext);
  if (!ctx) {
    throw new Error("useRegisterModal must be used within RegisterModalProvider");
  }
  return ctx;
}
