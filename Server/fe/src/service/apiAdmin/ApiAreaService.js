import authorizeAxiosInstance from "../serviceLayer/authorizeAxiosInstance";

export const GetData = async (CheckInOut) => {
    return await authorizeAxiosInstance.post("/CheckInOut/GetData", CheckInOut);
};
export const DeleteData = async (CheckInOut) => {
    return await authorizeAxiosInstance.post("/CheckInOut/DeleteData", CheckInOut);
};
export const CreateBypassScan = async (cameraSource = 'desktop') => {
    return await authorizeAxiosInstance.post("/CheckInOut/BypassScan", { cameraSource });
};
export const GetCameraConfig = async () => {
    return await authorizeAxiosInstance.get("/CameraConfig");
};
export const SaveCameraConfig = async (cameraSource) => {
    return await authorizeAxiosInstance.post("/CameraConfig", { cameraSource });
};
