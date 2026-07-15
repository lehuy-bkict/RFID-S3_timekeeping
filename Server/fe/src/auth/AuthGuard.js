import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function AuthGuard({ children }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    window.location.href = "/access/admins/home";
    return <h1>Loading...</h1>;
  }

  return <>{children}</>;
}
