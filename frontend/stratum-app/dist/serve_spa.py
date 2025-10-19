#!/usr/bin/env python3
import http.server
import socketserver
import pathlib

PORT = 6000
DIRECTORY = pathlib.Path(__file__).parent

class SPARequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = DIRECTORY / self.path.lstrip("/")
        if path.is_file():
            return super().do_GET()
        else:
            self.path = "/index.html"
            return super().do_GET()

with socketserver.TCPServer(("", PORT), SPARequestHandler) as httpd:
    print(f"Serving SPA on port {PORT}")
    httpd.serve_forever()
