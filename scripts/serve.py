"""dist を配る確認用サーバー(JS の MIME を明示)。python scripts/serve.py [port]"""
import http.server, os, sys, functools
http.server.SimpleHTTPRequestHandler.extensions_map.update({".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml"})
port = int(sys.argv[1]) if len(sys.argv) > 1 else 5297
root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)
H.log_message = lambda *a: None
http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
