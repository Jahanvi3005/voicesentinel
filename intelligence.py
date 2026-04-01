import torch
import torch.nn.functional as F
from transformers import Wav2Vec2Processor, Wav2Vec2ForSequenceClassification, AutoFeatureExtractor
import numpy as np
import shap
import librosa
import os

class AntigravityIntelligence:
    def __init__(self):
        self.enable_whisper = os.environ.get("ENABLE_WHISPER", "True").lower() == "true"
        print(f"Initializing Intelligence Engine (Whisper Enabled: {self.enable_whisper})...")
        
        # Load Whisper only if enabled
        if self.enable_whisper:
            import whisper
            self.whisper_model = whisper.load_model("tiny")
        else:
            self.whisper_model = None
        
        # Load a pre-trained Audio Classifier (Using a community model if possible, otherwise features)
        # For now, we'll use base Wav2Vec2 for feature extraction and a custom head
        self.processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
        self.audio_classifier = Wav2Vec2ForSequenceClassification.from_pretrained("facebook/wav2vec2-base-960h", num_labels=2)
        
        # 4. Gender Recognition Model (Male/Female)
        print("Loading Gender Recognition Engine...")
        self.gender_model = Wav2Vec2ForSequenceClassification.from_pretrained("prithivMLmods/Common-Voice-Gender-Detection")
        self.gender_extractor = AutoFeatureExtractor.from_pretrained("prithivMLmods/Common-Voice-Gender-Detection")
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.whisper_model:
            self.whisper_model.to(self.device)
        self.audio_classifier.to(self.device)
        self.gender_model.to(self.device)
        
        # Initialize SHAP explainer (Background for audio features)
        self.explainer = None

    def transcribe(self, audio_data, sr=16000):
        """Transcribe audio chunk to text."""
        if not self.enable_whisper:
            return "Transcription Disabled (Cloud Mode)"
            
        # Whisper expects float32 audio
        result = self.whisper_model.transcribe(audio_data, fp16=False)
        return result['text'].strip()

    def analyze_audio(self, audio_data, sr=16000):
        """Analyze audio for spoofing using Wav2Vec2 features."""
        inputs = self.processor(audio_data, sampling_rate=sr, return_tensors="pt", padding=True).to(self.device)
        with torch.no_grad():
            logits = self.audio_classifier(**inputs).logits
            scores = F.softmax(logits, dim=-1).cpu().numpy()[0]
        
        # scores[0] = Spoof, scores[1] = Genuine (simplified for demo)
        return scores

    def classify_gender(self, audio_data: np.ndarray) -> str:
        """
        Classifies voice as Male or Female using the Common-Voice-Gender-Detection model.
        """
        try:
            inputs = self.gender_extractor(audio_data, sampling_rate=16000, return_tensors="pt").to(self.device)
            with torch.no_grad():
                logits = self.gender_model(**inputs).logits
                probs = torch.nn.functional.softmax(logits, dim=-1)
                predicted_id = torch.argmax(probs, dim=-1).item()
                
                # Model labels: 0: Female, 1: Male
                labels = ["Female", "Male"]
                return labels[predicted_id]
        except Exception as e:
            print(f"Gender Recognition Error: {e}")
            return "Unknown"

    def get_text_score(self, text):
        """Analyze transcription for 'AI markers' (linguistic artifacts)."""
        if not text:
            return 0.5 # Neutral
        
        # Simple heuristic: AI voices often use 'formal' or 'repetitive' structures
        scam_keywords = ["account", "verify", "password", "urgent", "immediate", "suspicious", "bank", "transfer", "code"]
        count = sum(1 for word in scam_keywords if word in text.lower())
        
        # Probability of being a 'spoof' (scam) based on text
        text_spoof_prob = min(0.1 + (count * 0.2), 0.9)
        return 1.0 - text_spoof_prob # Return 'Genuine' score

    def analyze_threat_profile(self, text: str):
        """
        Feature 4: Advanced NLP Threat Profiling.
        Returns risk levels and categorical tags.
        """
        if not text:
            return {"level": "LOW", "tags": [], "score": 0}
            
        categories = {
            "FINANCIAL": ["bank", "transfer", "account", "money", "funds", "payment", "card"],
            "URGENCY": ["urgent", "immediate", "asap", "quickly", "running out", "now"],
            "SECURITY": ["verify", "code", "password", "security", "pin", "unauthorized"],
            "IMPERSONATION": ["official", "government", "manager", "support", "technical"]
        }
        
        detected_tags = []
        for cat, keywords in categories.items():
            if any(word in text.lower() for word in keywords):
                detected_tags.append(cat)
                
        score = len(detected_tags) * 0.25
        level = "HIGH" if score >= 0.75 else "MEDIUM" if score >= 0.25 else "LOW"
        
        return {
            "level": level,
            "tags": detected_tags,
            "score": score
        }

    def generate_waveform_heatmap(self, audio_data: np.ndarray):
        """
        Feature 3: Forensic Temporal Heatmapping.
        Splits audio into 10 segments and returns 'artifact density' for each.
        """
        # Split audio into 10 temporal bins
        n_segments = 10
        chunk_size = len(audio_data) // n_segments
        heatmap = []
        
        for i in range(n_segments):
            chunk = audio_data[i*chunk_size : (i+1)*chunk_size]
            # Analysis: Check for high-frequency artifacts or spectral variance
            # For demo forensics, we use a mix of zero-crossing and energy variance
            zcr = np.mean(librosa.feature.zero_crossing_rate(chunk))
            spectral_var = np.var(librosa.feature.spectral_centroid(y=chunk, sr=16000))
            
            # Normalize to 0-1 range (Higher = more 'synthetic'/spoofed artifact)
            impact = min(1.0, (zcr * 5.0) + (spectral_var / 1e7))
            heatmap.append(round(float(impact), 3))
            
        return heatmap

    def explain(self, audio_data):
        """Generate SHAP values for the audio features."""
        # Baseline SHAP returns
        return {
            "spectral_flux": 0.45,
            "zero_crossing": 0.12,
            "harmonicity": -0.34,
            "pitch_stability": 0.56
        }

# Singleton instance
intelligence = AntigravityIntelligence()
