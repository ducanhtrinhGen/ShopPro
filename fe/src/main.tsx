import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { LoginModalProvider } from "./auth/LoginModalContext";
import { RegisterModalProvider } from "./auth/RegisterModalContext";
import { LoginModal } from "./components/LoginModal";
import { RegisterModal } from "./components/RegisterModal";
import "./styles/global.css";
import "./styles/tailwind.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <LoginModalProvider>
          <RegisterModalProvider>
            <App />
            <LoginModal />
            <RegisterModal />
          </RegisterModalProvider>
        </LoginModalProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);