#!/usr/bin/env python3
import http.server
import socketserver
import pathlib

# Port to serve on
PORT = 6000

# Path to your frontend dist folder
# Adjust this if your script is moved
DIRECTORY = pathlib.Path(__file__).parent / "/dist"

class SPARequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Resolve requested path
        full_path = DIRECTORY / path.lstrip("/")

        # Serve file if it exists
        if full_path.exists() and full_path.is_file():
            return str(full_path)
        else:
            # Fallback to index.html for SPA routing
            return str(DIRECTORY / "index.html")

    # Optional: suppress logging for cleaner output
    def log_message(self, format, *args):
        pass

with socketserver.TCPServer(("", PORT), SPARequestHandler) as httpd:
    print(f"Serving SPA from {DIRECTORY} on port {PORT}")
    httpd.serve_forever()
