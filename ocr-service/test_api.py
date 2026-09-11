import urllib.request
import json
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# Health check
health_res = urllib.request.urlopen("http://127.0.0.1:8000/health").read().decode("utf-8")
print("[HEALTH CHECK]", health_res)

# Upload test
boundary = "----TestBoundary123456789"
with open("ocr-service/sample_court_doc.png", "rb") as f:
    file_bytes = f.read()

payload = bytearray()
payload.extend(f"--{boundary}\r\n".encode("utf-8"))
payload.extend(b'Content-Disposition: form-data; name="file"; filename="sample_court_doc.png"\r\n')
payload.extend(b"Content-Type: image/png\r\n\r\n")
payload.extend(file_bytes)
payload.extend(f"\r\n--{boundary}--\r\n".encode("utf-8"))

req = urllib.request.Request(
    "http://127.0.0.1:8000/ocr",
    data=bytes(payload),
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode("utf-8"))
    print("\n[HTTP POST /ocr RESPONSE]")
    print(json.dumps(res, indent=2, ensure_ascii=False))
