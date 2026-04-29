import json
from channels.generic.websocket import AsyncWebsocketConsumer


class QueueUpdatesConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.clinic_id = self.scope["url_route"]["kwargs"]["clinic_id"]
        self.doctor_id = self.scope["url_route"]["kwargs"]["doctor_id"]
        self.group_name = f"queue_updates_{self.clinic_id}_{self.doctor_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def queue_update(self, event):
        await self.send(text_data=json.dumps(event["payload"]))
