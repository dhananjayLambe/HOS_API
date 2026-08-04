# doctor/utils/uploads.py

import os
import uuid

from shared.logging import LogModule, logger

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

def digital_signature_upload_path(instance, filename):
    """
    Generate upload path for digital signature file.
    Pattern: govt_ids/digital_signature/{doctor_uuid}/{doctor_uuid}_DIGITAL_SIGNATURE_{uuid}.{ext}
    """
    try:
        ext = filename.split('.')[-1] if '.' in filename else 'pdf'
        doctor_uuid = str(instance.doctor.id).replace("-", "")
        unique_filename = f"{doctor_uuid}_DIGITAL_SIGNATURE_{uuid.uuid4().hex}.{ext}"
        upload_path = os.path.join('govt_ids', 'digital_signature', doctor_uuid, unique_filename)

        logger.info(
            "Digital signature upload path generated",
            module=LogModule.STORAGE,
            action="doctor.upload.digital_signature_path",
            metadata={"doctor_id": str(instance.doctor.id) if hasattr(instance, 'doctor') and instance.doctor else None},
        )

        return upload_path
    except Exception as exc:
        logger.exception(
            "Error generating digital signature upload path",
            module=LogModule.STORAGE,
            action="doctor.upload.digital_signature_path_failed",
            exc=exc,
        )
        ext = filename.split('.')[-1] if '.' in filename else 'pdf'
        fallback_path = os.path.join('govt_ids', 'digital_signature', f"digital_signature_{uuid.uuid4().hex}.{ext}")
        logger.warning(
            "Using fallback digital signature upload path",
            module=LogModule.STORAGE,
            action="doctor.upload.digital_signature_fallback_path",
        )
        return fallback_path
