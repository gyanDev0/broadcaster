import os
import shutil

# --- CLOUD-READY FFMPEG CONFIG ---
ffmpeg_path = shutil.which("ffmpeg")
if not ffmpeg_path:
    win_path = r"C:\Users\HP\AppData\Local\Microsoft\WinGet\Links"
    if os.path.exists(win_path):
        os.environ["PATH"] += os.pathsep + win_path
        ffmpeg_path = shutil.which("ffmpeg")

from flask import Flask, request, send_file
from gtts import gTTS
import io
from pydub import AudioSegment

if ffmpeg_path:
    AudioSegment.converter = ffmpeg_path
    print(f"[SERVER] FFmpeg loaded from: {ffmpeg_path}")
else:
    print("[WARNING] FFmpeg not found!")

import pandas as pd
from datetime import datetime

app = Flask(__name__)

# --- EXCEL LOGGING ---
EXCEL_FILE = "attendance_log.xlsx"

def log_to_excel(name):
    try:
        now = datetime.now()
        new_entry = {
            "Name": [name],
            "Date": [now.strftime("%Y-%m-%d")],
            "Time": [now.strftime("%H:%M:%S")]
        }
        df_new = pd.DataFrame(new_entry)
        
        if os.path.exists(EXCEL_FILE):
            df_existing = pd.read_excel(EXCEL_FILE)
            df_final = pd.concat([df_existing, df_new], ignore_index=True)
        else:
            df_final = df_new
            
        df_final.to_excel(EXCEL_FILE, index=False)
        print(f"[EXCEL] Recorded attendance for {name}")
    except Exception as e:
        print(f"[EXCEL ERROR] {e}")

@app.route('/get_audio')
def get_audio():
    name = request.args.get('name', 'User')
    
    # Log to Excel immediately
    log_to_excel(name)
    
    text = f"{name} attendance taken successfully"
    
    print(f"Generating audio for: {name}")
    
    try:
        # Check if ffmpeg is in path
        import shutil
        ffmpeg_path = shutil.which("ffmpeg")
        print(f"FFmpeg detected at: {ffmpeg_path}")

        # 1. Generate speech using gTTS
        tts = gTTS(text=text, lang='en')
        mp3_fp = io.BytesIO()
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)
        
        # 2. Convert to WAV using pydub
        try:
            audio = AudioSegment.from_mp3(mp3_fp)
        except Exception as pydub_err:
            print(f"Pydub Error: {pydub_err}")
            print("TIP: If FFmpeg is installed, try: AudioSegment.converter = r'C:/path/to/ffmpeg.exe'")
            raise pydub_err
        
        # 3. Export as 8-bit, 11025Hz, Mono WAV
        # Note: ESP32 DAC expects 8-bit unsigned samples
        wav_io = io.BytesIO()
        audio = audio.set_frame_rate(11025).set_channels(1).set_sample_width(1)
        audio.export(wav_io, format="wav")
        wav_io.seek(0)
        
        return send_file(wav_io, mimetype="audio/wav")
        
    except Exception as e:
        print(f"Error: {e}")
        return "Audio Generation Error", 500

if __name__ == '__main__':
    # Ensure you have ffmpeg installed for pydub to work
    app.run(host='0.0.0.0', port=5000, debug=True)
