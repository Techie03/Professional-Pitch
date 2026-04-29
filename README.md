# 🚀 Resume Optimization SLM — Model Deployment & Live Resume AI Tool

## 📌 Overview

This project demonstrates a **production-ready deployment pipeline** for a Resume Optimization System powered by a **Qwen3-4B Small Language Model (SLM)** fine-tuned with **QLoRA**.

The system takes a **resume + job description** as input and returns a **tailored, optimized resume** in **structured JSON format** and **downloadable PDF** — making it suitable for real-world hiring workflows.

> **Live Demo:** [https://techie03.github.io/Professional-Pitch/Model_Deployment.html](https://techie03.github.io/Professional-Pitch/Model_Deployment.html)

---

## ✨ What's Included

| File | Description |
|------|-------------|
| `Model_Deployment.html` | Full deployment documentation + **Live Resume AI Tool** |
| `resume_ai.js` | Client-side resume parsing, optimization & export engine |
| `resume_json_schema.html` | Interactive JSON schema viewer for the output format |
| `mp_abhinav_resume__2__20251205_230011.pdf` | Sample resume used for demonstration |

---

## 🧠 Live Resume AI Tool

A fully functional, **client-side** resume optimization tool built directly into the deployment page — **no third-party APIs or server required**.

### How It Works

```
Upload Resume (PDF / DOCX / TXT)
        ↓
Client-Side Text Extraction (PDF.js / mammoth.js)
        ↓
Adaptive Resume Parser (section detection, skill extraction, name/contact parsing)
        ↓
JD Keyword Optimization (match skills & summary to target job description)
        ↓
Output: Resume Preview + JSON Schema + PDF Download + Metrics
```

### Features

- **📄 File Upload** — Drag & drop or click to upload PDF, DOCX, or TXT resumes
- **🔍 Adaptive Parsing** — Multi-strategy name extraction, section detection, skill grouping
- **🎯 JD Optimization** — Matches resume content against job description keywords
- **📊 Structured JSON Output** — Follows the project's defined schema with validation
- **📥 PDF Export** — Generates a clean, formatted PDF of the optimized resume
- **📈 Quality Metrics** — Schema validity, JD keyword match %, skills extracted, sections found
- **🔒 100% Client-Side** — No data leaves your browser. Zero API calls. Free to use.

### Client-Side Libraries Used (via CDN)

| Library | Purpose | License |
|---------|---------|---------|
| [PDF.js](https://mozilla.github.io/pdf.js/) | Extract text from PDF files | Apache 2.0 |
| [mammoth.js](https://github.com/mwilliamson/mammoth.js) | Extract text from DOCX files | BSD 2-Clause |
| [jsPDF](https://github.com/parallax/jsPDF) | Generate downloadable PDF output | MIT |

---

## ⚙️ Architecture

```
User Browser
    ↓
FastAPI Backend
    ├── Resume Parser (PDF/DOCX → text) ← OCR pipeline
    ├── Text Cleaner (non-ASCII removal, whitespace normalization)
    ├── Prompt Builder (resume + JD → chat-format JSONL)
    ↓
Inference Server (vLLM / TGI)
    ├── Qwen3-4B-Instruct-2507 base + QLoRA LoRA adapter (4-bit, rank r=16)
    ├── Streaming token output
    ↓
JSON Schema Validator
    ├── Required field presence check
    ├── Hallucination detection (cross-reference vs original resume)
    ↓
Response → User (streamed tailored resume + quality metrics)
```

---

## 🏭 Production Readiness

### Deployment Modes

| Mode | Use Case | Latency |
|------|----------|---------|
| **Real-time** (primary) | Interactive single-user requests | 15–40s streamed |
| **Batch** (secondary) | Bulk processing / enterprise overnight jobs | Queued |

### Cost Comparison

| Deployment | Monthly Cost | Control |
|-----------|-------------|---------|
| GPT-4 API (10K tokens/req) | ~$8,000 | None — external dependency |
| Self-hosted Qwen3-4B (A10G) | ~$300–500 | Full — data stays on-premise |
| Self-hosted Qwen3-4B (RTX 4090) | ~$150–250 | Full |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Root health check |
| `GET` | `/health` | Model & hardware status |
| `GET` | `/schema` | JSON output schema definition |
| `POST` | `/optimize` | File-based resume inference |
| `POST` | `/optimize/text` | Text-based resume inference |

---

## 📊 Monitoring & Maintenance

### Key Metrics Tracked

- Request latency (target: <50s streamed)
- API failure rate (alert threshold: >2%)
- JSON schema validity rate
- Skill coverage & hallucination detection
- GPU utilization & VRAM usage

### Retraining Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Vocabulary drift | 30%+ new JD tokens absent from training vocab | Retrain with fresh teacher outputs |
| Quality degradation | Schema validity <93% OR hallucination >1.5% for 14 days | Emergency retraining cycle |
| Quarterly refresh | Every 90 days | Lightweight adapter update |

---

## 📂 Project Structure

```
XAI-Integration-and-Deployment/
│
├── Model_Deployment.html          # Main page — documentation + live tool
├── resume_ai.js                   # Client-side resume AI engine
├── resume_json_schema.html        # JSON schema viewer
├── mp_abhinav_resume__2__*.pdf    # Sample resume
└── README.md                      # This file
```

---

## 🚀 How to Use

### Option 1: Open Locally
```bash
# Clone the repository
git clone https://github.com/Techie03/XAI-Integration-and-Deployment.git

# Open in browser
open Model_Deployment.html
# or double-click the file
```

### Option 2: Live Demo
Visit: [https://techie03.github.io/Professional-Pitch/Model_Deployment.html](https://techie03.github.io/Professional-Pitch/Model_Deployment.html)

### Using the Resume AI Tool
1. **Upload** your resume (PDF, DOCX, or TXT)
2. **Paste** the target job description
3. Click **"Optimize resume →"**
4. View the **preview**, **JSON output**, and **metrics**
5. **Download** as PDF or JSON

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Base Model | Qwen3-4B-Instruct-2507 |
| Fine-tuning | QLoRA (rank r=16, 4-bit quantization) |
| Training Data | 1,530 resume–JD pairs |
| Backend | FastAPI |
| Inference | vLLM / TGI |
| Client-side AI | PDF.js + mammoth.js + jsPDF |
| Deployment | Docker, cloud GPU (A10G / RTX 4090) |
| Monitoring | Custom dashboard with drift detection |

---

## 👥 Team

| Member | Role |
|--------|------|
| **Vaishnav Busha** | Software Engineer Lead |
| **Nishith Chowdary Mareddy** | Model Development |
| **Jyothi Swaroop Ganapavarapu** | Data & Preprocessing Lead |
| **Talha Khan** | Evaluation & Cost Analysis |

---

## 📈 Future Improvements

- Automated retraining pipeline
- A/B testing for optimization quality
- Multi-model evaluation
- Enhanced hallucination detection
- Browser-based fine-tuning with WebGPU

---

## 📜 License

MIT License

---

**DTSC 5082 · Seminar in Research & Research Methodology · Professor: Clifford K. Whitworth**
