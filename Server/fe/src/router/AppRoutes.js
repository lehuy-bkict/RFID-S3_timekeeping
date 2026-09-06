import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Admin from "../components/page/admin/Admin";
import Home from "../components/page/admin/Home/home";
import CheckInRealtime from "../components/page/admin/CheckInRealtime/CheckInRealtime";
import CheckInEvent from "../components/page/admin/CheckInEvent/CheckInEvent";
import FaceVerification from "../components/page/admin/FaceVerification/FaceVerification";
import UserManagement from "../components/page/admin/UserManagement/UserManagement";
import LiveCamera from "../components/page/admin/LiveCamera/LiveCamera";

const AppRoutes = () => (
  <Routes>
    <Route path="/access/admins" element={<Admin />}>
      <Route path="home" element={<Home />} />
      <Route path="CheckInRealtime" element={<CheckInRealtime />} />
      <Route path="live-camera" element={<LiveCamera />} />
      <Route path="checkinevent" element={<CheckInEvent />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="face-verification" element={<FaceVerification />} />
    </Route>
    <Route path="*" element={<Navigate to="/access/admins/home" />} />
  </Routes>
);

export default AppRoutes;
