import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Admin from "../components/page/admin/Admin";
import Home from "../components/page/admin/Home/home";
import CheckInRealtime from "../components/page/admin/CheckInRealtime/CheckInRealtime";
import CheckInEvent from "../components/page/admin/CheckInEvent/CheckInEvent";

const AppRoutes = () => (
  <Routes>
    <Route path="/access/admins" element={<Admin />}>
      <Route path="home" element={<Home />} />
      <Route path="CheckInRealtime" element={<CheckInRealtime />} />
      <Route path="checkinevent" element={<CheckInEvent />} />
    </Route>
    <Route path="*" element={<Navigate to="/access/admins/home" />} />
  </Routes>
);

export default AppRoutes;
