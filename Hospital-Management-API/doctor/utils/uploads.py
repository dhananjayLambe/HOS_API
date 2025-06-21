# doctor/utils/uploads.py

import os
import uuid

def doctor_photo_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    doctor_uuid = str(instance.id).replace("-", "")
    #unique_filename = f"{uuid.uuid4().hex}.{ext}"
    unique_filename =  f"{doctor_uuid}_{uuid.uuid4().hex}.{ext}"
    return os.path.join('doctor_photos', doctor_uuid, unique_filename)

def doctor_kyc_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    doctor_uuid = str(instance.doctor.id).replace('-', '')
    filename = f"registration_{uuid.uuid4().hex}.{ext}"
    return os.path.join('doctor_kyc_docs', doctor_uuid, 'registration', filename)

def doctor_education_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    doctor_uuid = str(instance.doctor.id).replace('-', '')
    filename = f"edu_{uuid.uuid4().hex}.{ext}"
    return os.path.join('doctor_kyc_docs', doctor_uuid, 'education', filename)

def pan_card_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    doctor_uuid = str(instance.doctor.id).replace("-", "")
    filename = f"{doctor_uuid}_PAN_{uuid.uuid4().hex}.{ext}"
    return os.path.join('govt_ids', 'pan', doctor_uuid, filename)

def aadhar_card_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    doctor_uuid = str(instance.doctor.id).replace("-", "")
    filename = f"{doctor_uuid}_AADHAR_{uuid.uuid4().hex}.{ext}"
    return os.path.join('govt_ids', 'aadhar', doctor_uuid, filename)