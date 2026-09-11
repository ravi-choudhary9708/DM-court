"""
NyayaSahayak - Standalone OCR Engine Test Script
Tests local Hindi + English OCR recognition on a legal document sample using RapidOCR (PaddleOCR Devanagari ONNX model).
"""

import os
import sys
import time

# Ensure UTF-8 output for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
    capi_dir = r"C:\Users\Admin\AppData\Local\Programs\Python\Python313\Lib\site-packages\onnxruntime\capi"
    if os.path.exists(capi_dir):
        os.add_dll_directory(capi_dir)

from PIL import Image, ImageDraw, ImageFont

def create_sample_legal_image(output_path="sample_court_doc.png"):
    """Generate a clean sample Bihar DM court document image with Hindi text."""
    width, height = 900, 500
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Try to load Windows Nirmala UI (standard Hindi/Devanagari font on Windows)
    font_large = None
    font_medium = None
    font_regular = None

    font_paths = [
        "C:\\Windows\\Fonts\\Nirmala.ttf",
        "C:\\Windows\\Fonts\\mangal.ttf",
        "C:\\Windows\\Fonts\\aparaj.ttf",
        "C:\\Windows\\Fonts\\arial.ttf"
    ]

    for p in font_paths:
        if os.path.exists(p):
            try:
                font_large = ImageFont.truetype(p, 28)
                font_medium = ImageFont.truetype(p, 22)
                font_regular = ImageFont.truetype(p, 18)
                break
            except Exception:
                continue

    if not font_large:
        font_large = font_medium = font_regular = ImageFont.load_default()

    # Draw border
    draw.rectangle([(15, 15), (width - 15, height - 15)], outline=(100, 100, 100), width=2)

    # Draw court header & text lines
    lines = [
        ("न्यायालय समाहर्त्ता, मधुबनी", font_large, (0, 0, 0), 40),
        ("जमाबन्दी रद्दीकरण अपील वाद संख्या: 16/2025-26", font_medium, (20, 20, 20), 90),
        ("अपीलकर्त्ता: हरि ठाकुर, निवासी कमला रोड, जयनगर", font_regular, (30, 30, 30), 140),
        ("बनाम", font_medium, (150, 0, 0), 180),
        ("प्रतिवादी: सुशीला देवी, निवासी कमला रोड, जयनगर", font_regular, (30, 30, 30), 220),
        ("--------------------------------------------------------------------------------", font_regular, (180, 180, 180), 260),
        ("विषय: मौजा जयनगर, खाता संख्या 381, खेसरा संख्या 355, कुल रकबा 01 कट्ठा 10 धूर भूमि।", font_regular, (0, 0, 0), 300),
        ("बिहार भूमि दाखिल-खारिज अधिनियम 2011 की धारा 9(6)(A) के तहत प्रस्तुत अपील।", font_regular, (0, 0, 0), 340),
        ("आदेश: अपर समाहर्त्ता द्वारा पारित आदेश दिनांक 22.08.2025 के विरुद्ध अपील।", font_regular, (0, 0, 0), 380),
    ]

    for text, font, color, y_pos in lines:
        draw.text((40, y_pos), text, fill=color, font=font)

    img.save(output_path)
    print(f"[OK] Generated test document image: {output_path}")
    return output_path

def test_ocr(image_path):
    print("=" * 60)
    print("Initializing RapidOCR Engine with Devanagari (Hindi) Model...")
    start_init = time.time()
    
    from rapidocr_onnxruntime import RapidOCR
    
    rec_model = os.path.abspath("ocr-service/models/devanagari_PP-OCRv4_rec_infer.onnx")
    rec_keys = os.path.abspath("ocr-service/models/devanagari_dict.txt")

    engine = RapidOCR(
        rec_model_path=rec_model,
        rec_keys_path=rec_keys,
        rec_img_shape=[3, 48, 320]
    )
    print(f"[OK] Devanagari Model loaded in {time.time() - start_init:.2f} seconds")

    print(f"\nRunning OCR on {image_path}...")
    start_infer = time.time()
    result, elapse_list = engine(image_path)
    infer_time = time.time() - start_infer

    print(f"[OK] OCR Extraction completed in {infer_time:.3f} seconds\n")
    print("=" * 60)
    print("EXTRACTED LEGAL TEXT & CONFIDENCE SCORES:")
    print("=" * 60)

    if not result:
        print("[!] No text detected.")
        return

    extracted_lines = []
    for i, item in enumerate(result, 1):
        # item structure: [box_points, text, confidence]
        bbox, text, score = item[0], item[1], float(item[2])
        extracted_lines.append(text)
        print(f"[{i:02d}] (Confidence: {score*100:.1f}%) -> {text}")

    full_output = "\n".join(extracted_lines)
    print("\n" + "=" * 60)
    print("FULL RECONSTRUCTED DOCUMENT TEXT:")
    print("=" * 60)
    print(full_output)
    print("=" * 60)

if __name__ == "__main__":
    img_file = create_sample_legal_image("ocr-service/sample_court_doc.png")
    test_ocr(img_file)
