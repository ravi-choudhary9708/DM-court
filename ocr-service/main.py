"""
NyayaSahayak - Standalone Multilingual OCR Microservice
High-accuracy Hindi (Devanagari) + English OCR Engine using PaddleOCR Devanagari ONNX Runtime.

Endpoints:
- GET  /health -> Service health and model status
- POST /ocr    -> Extract text from uploaded document (PDF or Image)
- POST /ocr/url -> Extract text from a document URL
"""

import os
import sys
import io
import time
import tempfile
import urllib.request
from typing import List, Optional

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
    capi_dir = r"C:\Users\Admin\AppData\Local\Programs\Python\Python313\Lib\site-packages\onnxruntime\capi"
    if os.path.exists(capi_dir):
        os.add_dll_directory(capi_dir)

import fitz  # PyMuPDF
from PIL import Image
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from rapidocr_onnxruntime import RapidOCR

app = FastAPI(
    title="NyayaSahayak OCR Microservice",
    description="Standalone Bihar Court Document OCR Service supporting Hindi & English",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OCR Engine
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REC_MODEL = os.path.join(BASE_DIR, "models", "devanagari_PP-OCRv4_rec_infer.onnx")
REC_KEYS = os.path.join(BASE_DIR, "models", "devanagari_dict.txt")

print(f"[INIT] Loading Devanagari OCR Engine from {REC_MODEL}...")
ocr_engine = RapidOCR(
    rec_model_path=REC_MODEL,
    rec_keys_path=REC_KEYS,
    rec_img_shape=[3, 48, 320]
)
print("[INIT] OCR Engine initialized successfully!")


class OCRLineResult(BaseModel):
    line_number: int
    text: str
    confidence: float
    box: Optional[List[List[float]]] = None


class OCRPageResult(BaseModel):
    page_number: int
    text: str
    confidence: float
    line_count: int
    lines: Optional[List[OCRLineResult]] = []


class OCRResponse(BaseModel):
    status: str
    total_pages: int
    full_text: str
    average_confidence: float
    pages: List[OCRPageResult]
    processing_time_seconds: float


class URLRequest(BaseModel):
    url: str


def run_ocr_on_image_bytes(image_bytes: bytes) -> tuple:
    """Runs OCR on image bytes and returns (page_text, avg_confidence, line_count, line_results)."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_np = np.array(image)

    result, _ = ocr_engine(img_np)
    if not result:
        return "", 0.0, 0, []

    lines = []
    confs = []
    line_results = []
    for idx, item in enumerate(result):
        # item: [box, text, score]
        box = [[float(coord) for coord in pt] for pt in item[0]] if item[0] is not None else None
        text = str(item[1]).strip()
        score = float(item[2])
        if text:
            lines.append(text)
            confs.append(score)
            line_results.append(OCRLineResult(
                line_number=len(lines),
                text=text,
                confidence=round(score, 4),
                box=box
            ))

    full_page_text = "\n".join(lines)
    avg_conf = sum(confs) / len(confs) if confs else 0.0
    return full_page_text, avg_conf, len(lines), line_results


def process_document(file_bytes: bytes, filename: str) -> OCRResponse:
    """Processes PDF or Image document and returns structured OCR results."""
    start_time = time.time()
    is_pdf = filename.lower().endswith(".pdf") or file_bytes.startswith(b"%PDF")
    
    pages = []
    all_text_parts = []
    total_conf_sum = 0.0
    valid_pages_count = 0

    if is_pdf:
        # Open PDF with PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            # Render page to high-res image (2.0 zoom = ~150-200 DPI for crisp text)
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")

            page_text, avg_conf, line_count, line_results = run_ocr_on_image_bytes(img_bytes)
            pages.append(OCRPageResult(
                page_number=page_idx + 1,
                text=page_text,
                confidence=round(avg_conf, 4),
                line_count=line_count,
                lines=line_results
            ))
            if page_text:
                all_text_parts.append(f"--- Page {page_idx + 1} ---\n{page_text}")
                total_conf_sum += avg_conf
                valid_pages_count += 1
        doc.close()
    else:
        # Single Image file
        page_text, avg_conf, line_count, line_results = run_ocr_on_image_bytes(file_bytes)
        pages.append(OCRPageResult(
            page_number=1,
            text=page_text,
            confidence=round(avg_conf, 4),
            line_count=line_count,
            lines=line_results
        ))
        if page_text:
            all_text_parts.append(page_text)
            total_conf_sum += avg_conf
            valid_pages_count += 1

    overall_avg_conf = total_conf_sum / valid_pages_count if valid_pages_count > 0 else 0.0
    elapsed = time.time() - start_time

    return OCRResponse(
        status="success",
        total_pages=len(pages),
        full_text="\n\n".join(all_text_parts),
        average_confidence=round(overall_avg_conf, 4),
        pages=pages,
        processing_time_seconds=round(elapsed, 3)
    )


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "NyayaSahayak Standalone OCR",
        "engine": "PaddleOCR Devanagari ONNX",
        "languages": ["hi", "en", "devanagari"],
        "model_file": os.path.basename(REC_MODEL)
    }


@app.post("/ocr", response_model=OCRResponse)
async def ocr_upload(file: UploadFile = File(...)):
    """Extract text from uploaded document file (PDF or Image)."""
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        return process_document(content, file.filename or "document")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ocr/url", response_model=OCRResponse)
async def ocr_from_url(payload: URLRequest):
    """Download document from URL (e.g. Cloudinary) and extract text."""
    try:
        req = urllib.request.Request(
            payload.url,
            headers={"User-Agent": "NyayaSahayak-OCR/1.0"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read()
        filename = payload.url.split("?")[0].split("/")[-1]
        return process_document(content, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch or process URL: {str(e)}")


@app.get("/sample", response_model=OCRResponse)
def ocr_sample():
    """Run OCR on the built-in Bihar court sample document."""
    sample_path = os.path.join(BASE_DIR, "sample_court_doc.png")
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Sample court document not found")
    with open(sample_path, "rb") as f:
        content = f.read()
    return process_document(content, "sample_court_doc.png")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

