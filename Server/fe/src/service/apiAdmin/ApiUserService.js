import authorizeAxiosInstance from "../serviceLayer/authorizeAxiosInstance";

export const GetUserData = async (params = {}) => {
    return await authorizeAxiosInstance.post("/User/GetData", params);
};

export const CreateUser = async (userData) => {
    return await authorizeAxiosInstance.post("/User/Create", userData);
};

export const UpdateUser = async (userData) => {
    return await authorizeAxiosInstance.post("/User/Update", userData);
};

export const DeleteUser = async (userData) => {
    return await authorizeAxiosInstance.post("/User/Delete", userData);
};
