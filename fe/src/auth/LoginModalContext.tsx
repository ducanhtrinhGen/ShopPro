import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

export type OpenLoginModalOptions = {
  /** Runs after successful login; modal is closed first. */
  onSuccess?: () => void | Promise<void>;
};

type LoginModalContextValue = {
  isOpen: boolean;
  openLoginModal: (options?: OpenLoginModalOptions) => void;
  closeLoginModal: () => void;
  /** Called by LoginModal after auth succeeds; runs pending `onSuccess` then clears it. */
  completeLoginSuccess: () => Promise<void>;
};

const LoginModalContext = createContext<LoginModalContextValue | undefined>(undefined);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pendingOnSuccessRef = useRef<(() => void | Promise<void>) | null>(null);

  const closeLoginModal = useCallback(() => {
    setIsOpen(false);
    pendingOnSuccessRef.current = null;
  }, []);

  const openLoginModal = useCallback((options?: OpenLoginModalOptions) => {
    pendingOnSuccessRef.current = options?.onSuccess ?? null;
    setIsOpen(true);
  }, []);

  const completeLoginSuccess = useCallback(async () => {
    const fn = pendingOnSuccessRef.current;
    pendingOnSuccessRef.current = null;
    setIsOpen(false);
    if (fn) {
      await fn();
    }
  }, []);

  const value = useMemo<LoginModalContextValue>(
    () => ({
      isOpen,
      openLoginModal,
      closeLoginModal,
      completeLoginSuccess
    }),
    [isOpen, openLoginModal, closeLoginModal, completeLoginSuccess]
  );

  return <LoginModalContext.Provider value={value}>{children}</LoginModalContext.Provider>;
}

export function useLoginModal() {
  const ctx = useContext(LoginModalContext);
  if (!ctx) {
    throw new Error("useLoginModal must be used within LoginModalProvider");
  }
  return ctx;
}
