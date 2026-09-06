"""Offline face-verification microservice.

It deliberately uses only the Python standard library for HTTP, so FastAPI is
not required.  All inference remains on this machine through ONNX Runtime.
"""
import base64
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np
import insightface
import onnxruntime as ort
from insightface.utils import face_align

ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.environ.get("FACE_MODEL_DIR", os.path.join(ROOT, "models"))
# InsightFace buffalo_l: SCRFD-10G detector + ArcFace W600K R50 recognizer.
DET_PATH = os.path.join(MODEL_DIR, os.environ.get("FACE_DETECTION_MODEL", "scrfd_10g.onnx"))
REC_PATH = os.path.join(MODEL_DIR, os.environ.get("FACE_RECOGNITION_MODEL", "arcface_w600k_r50.onnx"))
detector = None
recognizer = None


def decode_image(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Ảnh phải là chuỗi Base64 hợp lệ")
    encoded = value.split(",", 1)[-1]
    try:
        raw = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise ValueError("Không thể giải mã Base64 của ảnh") from exc
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Dữ liệu không phải là ảnh hợp lệ")
    return image


def embedding(image):
    # max_num=1 returns the most confident/largest detected face.
    bboxes, keypoints = detector.detect(image, max_num=1)
    if bboxes is None or len(bboxes) == 0:
        return None
    aligned = face_align.norm_crop(image, landmark=keypoints[0])
    vector = recognizer.get_feat(aligned).flatten().astype(np.float32)
    magnitude = np.linalg.norm(vector)
    return vector / magnitude if magnitude else None


def verify(payload):
    card = embedding(decode_image(payload.get("cardImage")))
    if card is None:
        return {"success": False, "isMatch": False, "message": "Không tìm thấy một khuôn mặt rõ ràng trong ảnh thẻ/căn cước."}
    camera = embedding(decode_image(payload.get("cameraImage")))
    if camera is None:
        return {"success": False, "isMatch": False, "message": "Không tìm thấy một khuôn mặt rõ ràng trong ảnh camera."}

    try:
        threshold = float(payload.get("threshold", 0.4))
    except (TypeError, ValueError) as exc:
        raise ValueError("Ngưỡng so khớp phải là số") from exc
    if not 0 <= threshold <= 1:
        raise ValueError("Ngưỡng so khớp phải nằm trong khoảng 0 đến 1")

    similarity = float(np.dot(card, camera))
    return {
        "success": True,
        "isMatch": similarity >= threshold,
        "similarity": round(similarity, 4),
        "threshold": threshold,
        "model": "InsightFace buffalo_l: SCRFD-10G + ArcFace W600K R50 (ONNX, local)"
    }


import threading
import time

camera_service = None


class CameraService:
    def __init__(self, device_index=0):
        self.device_index = device_index
        self.cap = None
        self.running = False
        self.lock = threading.Lock()
        self.latest_frame = None
        self.latest_stream_jpeg = None
        self.thread = None

    def start(self):
        if self.running:
            return
        # Use CAP_DSHOW on Windows for fast device opening
        self.cap = cv2.VideoCapture(self.device_index, cv2.CAP_DSHOW)
        if not self.cap.isOpened():
            self.cap = cv2.VideoCapture(self.device_index)

        if not self.cap.isOpened():
            print(f"[Camera] Warning: Could not open camera {self.device_index}")
            return

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.running = True
        self.thread = threading.Thread(target=self._update, daemon=True)
        self.thread.start()
        print(f"[Camera] Hardware camera {self.device_index} opened and running")

    def _update(self):
        while self.running:
            if not self.cap or not self.cap.isOpened():
                time.sleep(0.5)
                continue
            ret, frame = self.cap.read()
            if not ret or frame is None:
                time.sleep(0.04)
                continue

            # Downscale / compress JPEG for fast Socket.IO transmission (~50 quality)
            _, stream_buf = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 55])
            stream_bytes = stream_buf.tobytes()

            with self.lock:
                self.latest_frame = frame
                self.latest_stream_jpeg = stream_bytes

            time.sleep(0.035)

    def get_stream_frame(self):
        with self.lock:
            return self.latest_stream_jpeg

    def get_snapshot_base64(self, target_max_dim=640):
        with self.lock:
            frame = self.latest_frame
        if frame is None:
            return None

        # Thu nhỏ kích thước ảnh (kích thước pixel) theo tỷ lệ chuẩn của detector (640x640)
        # nhưng GIỮ NGUYÊN chất lượng ảnh (JPEG quality 92) để không bị vỡ khối/nhiễu ảnh
        h, w = frame.shape[:2]
        if max(h, w) > target_max_dim:
            scale = target_max_dim / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            processed_frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
        else:
            processed_frame = frame

        # Mã hóa JPEG chất lượng cao (92%) bảo toàn chi tiết mắt, mũi, miệng cho InsightFace
        _, buf = cv2.imencode('.jpg', processed_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        b64 = base64.b64encode(buf).decode('utf-8')
        return f"data:image/jpeg;base64,{b64}"

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
        if self.cap and self.cap.isOpened():
            self.cap.release()
            print("[Camera] Camera released")


class Handler(BaseHTTPRequestHandler):
    def _json(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/health":
            return self._json(200, {
                "status": "ok",
                "modelsLoaded": detector is not None and recognizer is not None,
                "cameraActive": camera_service is not None and camera_service.running
            })
        elif self.path == "/camera/frame":
            jpeg = camera_service.get_stream_frame() if camera_service else None
            if jpeg is None:
                return self._json(503, {"message": "Camera not ready"})
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Content-Length", str(len(jpeg)))
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.end_headers()
            self.wfile.write(jpeg)
            return
        elif self.path == "/camera/snapshot":
            b64 = camera_service.get_snapshot_base64() if camera_service else None
            if not b64:
                return self._json(503, {"success": False, "message": "Camera snapshot unavailable"})
            return self._json(200, {"success": True, "image": b64})
        self._json(404, {"message": "Not found"})

    def do_POST(self):
        if self.path != "/verify":
            return self._json(404, {"message": "Not found"})
        try:
            size = int(self.headers.get("Content-Length", 0))
            if not 0 < size <= 25 * 1024 * 1024:
                raise ValueError("Kích thước yêu cầu không hợp lệ hoặc vượt 25 MB")
            payload = json.loads(self.rfile.read(size).decode("utf-8"))
            self._json(200, verify(payload))
        except (ValueError, json.JSONDecodeError) as exc:
            self._json(400, {"success": False, "isMatch": False, "message": str(exc)})
        except Exception as exc:
            print("[Face AI] Verification error:", exc)
            self._json(500, {"success": False, "isMatch": False, "message": "Lỗi xử lý AI cục bộ"})

    def log_message(self, *_):
        pass


def main():
    global detector, recognizer, camera_service
    missing = [p for p in (DET_PATH, REC_PATH) if not os.path.isfile(p)]
    if missing:
        raise FileNotFoundError("Thiếu model ONNX local: " + ", ".join(missing))
    # CUDA/cuDNN runtime packages installed by pip are not automatically on
    # Windows PATH.  Let ONNX Runtime preload them before it opens a session.
    try:
        ort.preload_dlls(directory="")
    except Exception as exc:
        print(f"[Face AI] CUDA DLL preload skipped: {exc}")

    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    detector = insightface.model_zoo.get_model(DET_PATH, providers=providers)
    detector.prepare(ctx_id=0, input_size=(640, 640), det_thresh=0.45)
    recognizer = insightface.model_zoo.get_model(REC_PATH, providers=providers)
    recognizer.prepare(ctx_id=0)
    active_providers = detector.session.get_providers()
    print(f"[Face AI] Active execution providers: {active_providers}")

    # Start always-on camera hardware capture
    camera_service = CameraService(device_index=int(os.environ.get("CAMERA_INDEX", 0)))
    camera_service.start()

    print("[Face AI] Ready at http://127.0.0.1:5000 (local ONNX inference + Camera Stream)")
    try:
        ThreadingHTTPServer(("127.0.0.1", 5000), Handler).serve_forever()
    finally:
        if camera_service:
            camera_service.stop()


if __name__ == "__main__":
    main()

