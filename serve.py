#!/usr/bin/env python3
"""Start a local server for these study notes.

Usage:
    python3 serve.py          # serve on http://localhost:8000
    python3 serve.py 3000     # serve on http://localhost:3000

Then open the printed URL in your browser. Stop with Ctrl+C.
"""

import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, fmt, *args):  # keep the console quiet
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    url = f"http://localhost:{PORT}"
    try:
        with Server(("", PORT), Handler) as httpd:
            print(f"ISLP Companion is being served from {DIRECTORY}")
            print(f"Open {url}  (Ctrl+C to stop)")
            httpd.serve_forever()
    except OSError:
        print(f"Port {PORT} is already in use. Try:  python3 serve.py {PORT + 1}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == "__main__":
    main()
