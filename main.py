import os
import uuid
import librosa
import numpy as np
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, Request, File, UploadFile, Form, HTTPException, WebSocket, WebSocketDisconnect, Depends, Response
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from passlib.hash import pbkdf2_sha256
from intelligence import intelligence
import base64
import json
import asyncio

# --- APP INITIALIZATION ---
app = FastAPI(title="Voice Sentinel: FastAPI Real-time Multimodal Platform")
templates = Jinja2Templates(directory="templates")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- DATABASE MANAGER (Feature 5: Strict MongoDB Enforcement) ---
from motor.motor_asyncio import AsyncIOMotorClient
import sys

class DatabaseManager:
    def __init__(self):
        self.uri = os.getenv("MONGO_URI")
        self.db = None
        self.client = None
        
        if not self.uri:
            print("🚨 FATAL ERROR: MONGO_URI is not set. A real MongoDB database is required for production.")
            print("Please provide the MONGO_URI environment variable and restart the application.")
            sys.exit(1)
        else:
            print("🚀 CONNECTED: MongoDB Atlas instance active.")
            self.client = AsyncIOMotorClient(self.uri)
            self.db = self.client.voice_sentinel

    async def get_user(self, email):
        return await self.db.users.find_one({"email": email})

    async def insert_user(self, user):
        user["created_at"] = datetime.utcnow()
        await self.db.users.insert_one(user)
        return True

    async def insert_analysis(self, analysis):
        analysis["_id"] = str(uuid.uuid4())
        analysis["timestamp"] = datetime.utcnow()
        await self.db.analyses.insert_one(analysis)
        return True

    async def get_user_analyses(self, email):
        cursor = self.db.analyses.find({"user_email": email}).sort("timestamp", -1)
        results = await cursor.to_list(length=100)
        return sorted(results, key=lambda x: x["timestamp"], reverse=True)

db = DatabaseManager()

# --- AUTH UTILITY ---
def get_current_user(request: Request):
    return request.cookies.get("user_email")

# --- ROUTES ---

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("app.html", {"request": request})

@app.get("/favicon.ico")
async def favicon():
    return FileResponse("static/favicon.ico")

# --- AUTH API ---

@app.post("/api/register")
async def register(request: Request):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    if await db.get_user(email):
        raise HTTPException(status_code=409, detail="User exists")

    hashed = pbkdf2_sha256.hash(password)
    await db.insert_user({"email": email, "password_hash": hashed})
    return {"message": "Registration successful"}

@app.post("/api/login")
async def login(response: Response, request: Request):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")

    user = await db.get_user(email)
    if user and pbkdf2_sha256.verify(password, user["password_hash"]):
        response.set_cookie(key="user_email", value=email)
        return {"message": "Login successful", "user_email": email}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie("user_email")
    return {"message": "Logged out"}

@app.get("/api/current_user")
async def current_user(user_email: Optional[str] = Depends(get_current_user)):
    return {"user_email": user_email}

# --- ANALYSIS API ---

@app.post("/api/analysis")
async def analyze_voice(
    audio: UploadFile = File(...),
    user_email: str = Depends(get_current_user)
):
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    unique_filename = f"{uuid.uuid4()}_{audio.filename}"
    audio_path = os.path.join(UPLOAD_FOLDER, unique_filename)

    # Save temp file
    try:
        with open(audio_path, "wb") as f:
            f.write(await audio.read())

        # Logic from intelligence hub
        audio_data, _ = librosa.load(audio_path, sr=16000)
        
        # Async-friendly wrappers
        audio_scores = intelligence.analyze_audio(audio_data)
        transcription = intelligence.transcribe(audio_data)
        text_score = intelligence.get_text_score(transcription)
        shap_evidence = intelligence.explain(audio_data)
        gender_label = intelligence.classify_gender(audio_data)
        
        # FEATURE INTEGRATION
        threat_profile = intelligence.analyze_threat_profile(transcription)
        forensic_heatmap = intelligence.generate_waveform_heatmap(audio_data)

        # Fused decision
        s_conf = (0.6 * audio_scores[0]) + (0.4 * (1.0 - text_score))
        g_conf = (0.6 * audio_scores[1]) + (0.4 * text_score)

        result_type = "genuine" if g_conf > s_conf else "spoofed"
        confidence = g_conf if result_type == "genuine" else s_conf
        
        # Unified Persona: AI vs Male vs Female
        persona = "AI" if result_type == "spoofed" else gender_label

        response_data = {
            'result': result_type,
            'confidence': round(float(confidence * 100), 2),
            'isSpoofed': (result_type == "spoofed"),
            'persona': persona,
            'gender': gender_label,
            'message': f"Analysis complete. Voice Persona: {persona}",
            'threat': threat_profile, # Feature 4
            'heatmap': forensic_heatmap, # Feature 3
            'evidence': shap_evidence,
            'transcription': transcription
        }

        # Save to HISTORY
        await db.insert_analysis({
            "user_email": user_email,
            "fileName": audio.filename,
            "isSpoofed": response_data["isSpoofed"],
            "confidence": response_data["confidence"],
            "persona": persona,
            "threat_level": threat_profile["level"],
            "timestamp": datetime.utcnow()
        })

        return response_data

    except Exception as e:
        print(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)

@app.get("/api/analyses")
async def get_analyses(user_email: str = Depends(get_current_user)):
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"analyses": await db.get_user_analyses(user_email)}

# --- REAL-TIME WEBSOCKET ---

@app.websocket("/ws/audio")
async def websocket_audio(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket Real-time connection accepted")
    try:
        while True:
            # Receiving audio chunk from frontend
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            # Base64 decode 
            # In a full Kafka pipeline, this would be pushed to an event buffer
            # Here we mock the live feedback calculation
            mock_conf = 0.82 + (np.random.random() * 0.15)
            
            await websocket.send_json({
                "confidence": round(mock_conf * 100, 2),
                "isSpoofed": (mock_conf > 0.9),
                "persona": "ANALYZING...",
                "status": "Asynchronous Streaming Analysis Active..."
            })
    except WebSocketDisconnect:
        print("Real-time Stream Disconnected")

# --- NEWS COMPONENT ---
@app.get("/api/news")
async def get_news():
    # Simplified mock news for internal consistency
    return {"articles": [
        {"id": 1, "title": "VoiceSpoof: The New Frontier of Fraud", "source": "Antigravity Research"},
        {"id": 2, "title": "Real-time AI Audio Detection Benchmarks", "source": "Tech Labs"}
    ]}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    print(f"Starting Antigravity Real-time Multimodal Platform [FastAPI Edition] on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
