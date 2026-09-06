# Local Face Verification Microservice (InsightFace Buffalo_L)

This microservice compares a reference employee portrait image (`cardImage`) with a live camera snapshot (`cameraImage`) using cosine similarity on ArcFace embeddings. All image processing and inference run locally without external cloud dependencies or telemetry.

## Models Used

The service uses decoupled components from **InsightFace Buffalo_L**:
- **Face Detection & Alignment**: `SCRFD-10G` (`scrfd_10g.onnx`)
- **Feature Recognition**: `ArcFace W600K R50` (`arcface_w600k_r50.onnx`)

Inference is executed using ONNX Runtime.

## Model Setup

Place the two ONNX model files inside the `models/` directory:
- `scrfd_10g.onnx`
- `arcface_w600k_r50.onnx`

Alternative model paths can be specified using the environment variables `FACE_MODEL_DIR`, `FACE_DETECTION_MODEL`, and `FACE_RECOGNITION_MODEL`.

## Execution

Activate your Python virtual environment and start the service:

```bash
python ai_service.py
```

On Windows, you can also run `start_ai_service.bat`. The Node.js backend can also automatically spawn this service if `AI_SERVICE_AUTOSTART=true` is enabled in `Server/be/.env`.

## Hardware Acceleration

- **NVIDIA GPU**: Supports CUDA 12.x through `onnxruntime-gpu[cuda,cudnn]==1.26.0`. Bundled DLLs are loaded via `onnxruntime.preload_dlls()` without requiring system-wide CUDA installation.
- **CPU Fallback**: Automatically falls back to CPU execution if no compatible CUDA GPU is detected.

## Verification Threshold

The default cosine similarity threshold is set to `0.40`. Scores at or above this threshold indicate a matching identity.
