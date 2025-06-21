# doctor/utils/uploads.py

import os
import uuid

def doctor_photo_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    doctor_uuid = str(instance.id).replace("-", "")
    #unique_filename = f"{uuid.uuid4().hex}.{ext}"
    unique_filename =  f"{doctor_uuid}_{uuid.uuid4().hex}.{ext}"
    return os.path.join('doctor_photos', doctor_uuid, unique_filename)