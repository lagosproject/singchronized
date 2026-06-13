import asyncio
import json


class ConnectionManager:
    """Tracks websocket clients and allows broadcasting from worker threads."""

    def __init__(self):
        self.clients = []
        self._loop = None

    def bind_loop(self, loop):
        self._loop = loop

    async def connect(self, websocket):
        await websocket.accept()
        self.clients.append(websocket)

    def disconnect(self, websocket):
        if websocket in self.clients:
            self.clients.remove(websocket)

    async def broadcast(self, message: dict):
        text = json.dumps(message)
        for client in list(self.clients):
            try:
                await client.send_text(text)
            except Exception:
                self.disconnect(client)

    def broadcast_threadsafe(self, message: dict):
        """Schedule a broadcast from a non-async thread (AI workers)."""
        if self._loop is None:
            return
        asyncio.run_coroutine_threadsafe(self.broadcast(message), self._loop)


manager = ConnectionManager()
