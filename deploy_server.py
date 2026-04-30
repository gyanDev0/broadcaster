from waitress import serve
from tts_server import app
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('waitress')
logger.setLevel(logging.INFO)

import os

if __name__ == "__main__":
    # Render and other cloud providers provide a PORT environment variable
    port = int(os.environ.get("PORT", 5000))
    
    print("-----------------------------------------")
    print("   ESP32 ATTENDANCE - PRODUCTION SERVER  ")
    print("-----------------------------------------")
    print(f"Server is active at: http://0.0.0.0:{port}")
    print("Press Ctrl+C to stop.")
    
    # Run the server
    serve(app, host='0.0.0.0', port=port, threads=6)
