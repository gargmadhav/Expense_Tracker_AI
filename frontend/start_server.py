import http.server
import socketserver
import webbrowser
import threading
import time

PORTS_TO_TRY = [8000, 8001, 8002, 3000, 5000]

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def open_browser(port):
    time.sleep(1)
    url = f"http://localhost:{port}"
    print(f"\nLaunching Chrome/Browser automatically at: {url}\n")
    webbrowser.open(url)

if __name__ == "__main__":
    Handler = http.server.SimpleHTTPRequestHandler
    
    httpd = None
    selected_port = 8000

    for port in PORTS_TO_TRY:
        try:
            httpd = ReusableTCPServer(("", port), Handler)
            selected_port = port
            break
        except OSError:
            continue

    if httpd is None:
        print("Error: Could not find an open port. Please close existing servers.")
    else:
        threading.Thread(target=open_browser, args=(selected_port,), daemon=True).start()
        print("==================================================")
        print(" Smart Expense Tracker AI Frontend Server Started")
        print(f" Running at: http://localhost:{selected_port}")
        print(" Opening Chrome / Default Browser automatically...")
        print("==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped cleanly.")
