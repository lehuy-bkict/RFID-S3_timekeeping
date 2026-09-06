import authorizeAxiosInstance from '../serviceLayer/authorizeAxiosInstance';

export async function verifyFaces(payload) {
  const response = await authorizeAxiosInstance.post('/FaceVerification/Verify', payload);
  return response.data;
}
