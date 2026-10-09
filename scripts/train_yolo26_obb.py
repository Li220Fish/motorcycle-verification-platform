"""
Train / export the RiDE part detector with Ultralytics YOLO26-OBB.

  pip install -U ultralytics          # YOLO26 ships in ultralytics >= 8.4.0
  python scripts/train_yolo26_obb.py --data datasets/ride-obb/data.yaml
  python scripts/train_yolo26_obb.py --data datasets/ride-obb/data.yaml \
      --model yolo26n-obb.pt --export tflite     # on-device capture guidance

Model choice:
  yolo26s-obb.pt  admin pre-annotation / server-side checks (start here)
  yolo26n-obb.pt  on-phone real-time "is the part inside the guide" check

Licensing: Ultralytics models/code are AGPL-3.0. Fine for research/student
use; a closed commercial RiDE build needs an Ultralytics Enterprise License
(or an Apache-2.0 alternative). Check before shipping.
"""
import argparse

from ultralytics import YOLO


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--data", required=True, help="data.yaml from export-training-dataset.mjs")
    p.add_argument("--model", default="yolo26s-obb.pt")
    p.add_argument("--epochs", type=int, default=150)
    p.add_argument("--imgsz", type=int, default=1024, help="photos are 3:4 portrait; 1024 keeps thin fork legs legible")
    p.add_argument("--batch", type=int, default=-1, help="-1 = auto")
    p.add_argument("--device", default=None, help="e.g. 0, cpu, mps")
    p.add_argument("--name", default="ride-obb")
    p.add_argument("--export", default=None, help="optional export format after training: tflite, coreml, onnx…")
    a = p.parse_args()

    model = YOLO(a.model)
    model.train(
        data=a.data,
        epochs=a.epochs,
        imgsz=a.imgsz,
        batch=a.batch,
        device=a.device,
        name=a.name,
        # Left/right shots are mirror images of the same part — horizontal
        # flips are valid augmentation. Vertical flips are not (bikes don't
        # appear upside-down), and the guide frames already fix scale, so
        # keep scale jitter moderate.
        fliplr=0.5,
        flipud=0.0,
        degrees=8.0,
        scale=0.3,
        patience=40,
    )
    metrics = model.val()
    print(f"mAP50-95(OBB): {metrics.box.map:.4f}  mAP50: {metrics.box.map50:.4f}")

    if a.export:
        # YOLO26 is NMS-free end-to-end, so the exported graph needs no
        # post-processing step on the phone.
        model.export(format=a.export, imgsz=a.imgsz)


if __name__ == "__main__":
    main()
