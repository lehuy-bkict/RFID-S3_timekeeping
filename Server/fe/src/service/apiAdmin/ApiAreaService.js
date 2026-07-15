import authorizeAxiosInstance from "../serviceLayer/authorizeAxiosInstance";

export const GetData = async (CheckInOut) => {
    return await authorizeAxiosInstance.post("/CheckInOut/GetData", CheckInOut);
};
export const DeleteData = async (CheckInOut) => {
    return await authorizeAxiosInstance.post("/CheckInOut/DeleteData", CheckInOut);
};

