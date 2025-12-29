# doctor/api/utils/progress_calculator.py
from datetime import date
from doctor.models import (
    doctor as Doctor, DoctorAddress, Registration, GovernmentID, DoctorBankDetails, DoctorFeeStructure
)

def calculate_doctor_profile_progress(doctor):
    """
    Returns progress and pending sections as a dictionary.
    Calculates profile completion percentage based on required sections.
    """
    sections = {}

    # Personal info: photo, dob, title
    try:
        personal_ok = bool(doctor.photo) and bool(doctor.dob) and bool(doctor.title)
    except Exception:
        personal_ok = False
    sections["personal_info"] = personal_ok

    # Address
    try:
        addr = DoctorAddress.objects.filter(doctor=doctor).first()
        addr_ok = bool(addr and addr.address and addr.city and addr.pincode)
    except Exception:
        addr_ok = False
    sections["address"] = addr_ok

    # Professional: at least one education or specialization or registration
    try:
        prof_ok = (
            doctor.education.exists() or 
            doctor.specializations.exists() or 
            getattr(doctor, "registration", None) is not None
        )
    except Exception:
        prof_ok = False
    sections["professional"] = prof_ok

    # KYC: gov id or registration
    try:
        govt_ids = getattr(doctor, "government_ids", None)
        reg = getattr(doctor, "registration", None)
        kyc_ok = bool(
            (govt_ids and getattr(govt_ids, "aadhar_card_number", None)) or
            (reg and getattr(reg, "medical_registration_number", None))
        )
    except Exception:
        kyc_ok = False
    sections["kyc"] = kyc_ok

    # Clinic association
    try:
        clinic_ok = doctor.clinics.exists()
    except Exception:
        clinic_ok = False
    sections["clinic_association"] = clinic_ok

    # Fee / services
    try:
        # Check fee structure using direct query instead of related manager
        fee_ok = DoctorFeeStructure.objects.filter(doctor=doctor).exists()
        services_ok = doctor.services.exists()
        sections["services_or_fee"] = bool(fee_ok or services_ok)
    except Exception:
        sections["services_or_fee"] = False

    # Bank details
    try:
        bank = DoctorBankDetails.objects.filter(doctor=doctor).first()
        bank_ok = bool(bank and bank.account_number)
    except Exception:
        bank_ok = False
    sections["bank_details"] = bank_ok

    # Compute progress
    total = len(sections)
    completed = sum(1 for v in sections.values() if v)
    progress = int((completed / total) * 100) if total > 0 else 0
    pending = [k for k, v in sections.items() if not v]

    return {"progress": progress, "pending_sections": pending}




# # doctor/api/utils/progress_calculator.py
# from datetime import date
# from doctor.models import (
#     doctor as Doctor, DoctorAddress, Registration, GovernmentID,DoctorBankDetails
# )

# def calculate_doctor_profile_progress(doctor):
#     """
#     Returns progress and pending sections as a dictionary.
#     """
#     print("calculate_doctor_profile_progress")
#     sections = {}

#     # Personal info: photo, dob, title, about
#     personal_ok = bool(doctor.photo) and bool(doctor.dob) and bool(doctor.title)
#     sections["personal_info"] = personal_ok

#     # Address
#     try:
#         addr = DoctorAddress.objects.get(doctor=doctor).first()
#         if addr:
#             addr_ok = bool(addr.address and addr.city and addr.pincode)
#         else:
#             addr_ok = False
#     except DoctorAddress.DoesNotExist:
#         addr_ok = False
#     sections["address"] = addr_ok

#     # Professional: at least one education or specialization or registration
#     prof_ok = doctor.education.exists() or doctor.specializations.exists() or getattr(doctor, "registration", None) is not None
#     sections["professional"] = prof_ok

#     # KYC: gov id or registration
#     kyc_ok = getattr(getattr(doctor, "government_ids", None), "aadhar_card_number", None) or getattr(getattr(doctor, "registration", None), "medical_registration_number", None)
#     sections["kyc"] = bool(kyc_ok)

#     # Clinic association
#     clinic_ok = doctor.clinics.exists()
#     sections["clinic_association"] = clinic_ok

#     # Fee / followup / services are not mandatory; still we check for at least one fee/service
#     fee_ok = doctor.doctorfeestructure_set.exists() if hasattr(doctor, "doctorfeestructure_set") else False
#     services_ok = doctor.services.exists()
#     sections["services_or_fee"] = bool(fee_ok or services_ok)

#     # Bank model optional
#     bank_present = False
#     try:
#         bank = DoctorBankDetails.objects.filter(doctor=doctor).first()
#         bank_present = True if bank else False
#     except Exception:
#         bank_present = False

#     if bank_present:
#         try:
#             bank_ok = bool(bank.account_number)
#         except Exception:
#             bank_ok = False
#         sections["bank_details"] = bank_ok

#     # Compute progress weight: equal weights across available keys
#     total = len(sections)
#     completed = sum(1 for v in sections.values() if v)
#     progress = int((completed / total) * 100) if total > 0 else 0
#     pending = [k for k, v in sections.items() if not v]

#     # Return progress and pending sections as a dictionary
#     return {"progress": progress, "pending_sections": pending}

# def calculate_doctor_profile_progress(doctor):
#     """
#     Returns dict: {"progress": int, "pending_sections": [keys]}
#     Sections considered: personal_info, address, professional, kyc, clinic, bank (if bank model present)
#     """
#     print("calculate_doctor_profile_progress")
#     sections = {}

#     # Personal info: photo, dob, title, about
#     personal_ok = bool(doctor.photo) and bool(doctor.dob) and bool(doctor.title)
#     sections["personal_info"] = personal_ok

#     # Address
#     try:
#         addr = doctor.address
#         addr_ok = bool(addr.address and addr.city and addr.pincode)
#     except DoctorAddress.DoesNotExist:
#         addr_ok = False
#     sections["address"] = addr_ok

#     # Professional: at least one education or specialization or registration
#     prof_ok = doctor.education.exists() or doctor.specializations.exists() or getattr(doctor, "registration", None) is not None
#     sections["professional"] = prof_ok

#     # KYC: gov id or registration
#     kyc_ok = getattr(getattr(doctor, "government_ids", None), "aadhar_card_number", None) or getattr(getattr(doctor, "registration", None), "medical_registration_number", None)
#     sections["kyc"] = bool(kyc_ok)

#     # Clinic association
#     clinic_ok = doctor.clinics.exists()
#     sections["clinic_association"] = clinic_ok

#     # Fee / followup / services are not mandatory; still we check for at least one fee/service
#     fee_ok = doctor.doctorfeestructure_set.exists() if hasattr(doctor, "doctorfeestructure_set") else False
#     services_ok = doctor.services.exists()
#     sections["services_or_fee"] = bool(fee_ok or services_ok)

#     # Bank model optional
#     bank_present = False
#     try:
#         bank = DoctorBankDetails.objects.filter(doctor=doctor).first()
#         bank_present = True if bank else False
#     except Exception:
#         bank_present = False

#     if bank_present:
#         try:
#             bank_ok = bool(bank.account_number)
#         except Exception:
#             bank_ok = False
#         sections["bank_details"] = bank_ok

#     # Compute progress weight: equal weights across available keys
#     total = len(sections)
#     completed = sum(1 for v in sections.values() if v)
#     progress = int((completed / total) * 100) if total > 0 else 0
#     pending = [k for k, v in sections.items() if not v]

#     return {"progress": progress, "pending_sections": pending}

# def calculate_doctor_profile_progress(doctor):
#     """
#     Returns dict: {"progress": int, "pending_sections": [keys]}
#     Sections considered: personal_info, address, professional, kyc, clinic, bank (if bank model present)
#     """
#     print("calculate_doctor_profile_progress")
#     sections = {}

#     # Personal info: photo, dob, title, about
#     personal_ok = bool(doctor.photo) and bool(doctor.dob) and bool(doctor.title)
#     sections["personal_info"] = personal_ok

#     # Address
#     try:
#         addr = doctor.address
#         addr_ok = bool(addr.address and addr.city and addr.pincode)
#     except DoctorAddress.DoesNotExist:
#         addr_ok = False
#     sections["address"] = addr_ok

#     # Professional: at least one education or specialization or registration
#     prof_ok = doctor.education.exists() or doctor.specializations.exists() or getattr(doctor, "registration", None) is not None
#     sections["professional"] = prof_ok

#     # KYC: gov id or registration
#     kyc_ok = getattr(getattr(doctor, "government_ids", None), "aadhar_card_number", None) or getattr(getattr(doctor, "registration", None), "medical_registration_number", None)
#     sections["kyc"] = bool(kyc_ok)

#     # Clinic association
#     clinic_ok = doctor.clinics.exists()
#     sections["clinic_association"] = clinic_ok

#     # Fee / followup / services are not mandatory; still we check for at least one fee/service
#     fee_ok = doctor.doctorfeestructure_set.exists() if hasattr(doctor, "doctorfeestructure_set") else False
#     services_ok = doctor.services.exists()
#     sections["services_or_fee"] = bool(fee_ok or services_ok)

#     # Bank model optional
#     bank_present = False
#     try:
        
#         bank_present = True
#     except Exception:
#         bank_present = False

#     if bank_present:
#         try:
#             bank = DoctorBankDetails.objects.filter(doctor=doctor).first()
#             bank_ok = bool(bank and bank.account_number)
#         except Exception:
#             bank_ok = False
#         sections["bank_details"] = bank_ok

#     # Compute progress weight: equal weights across available keys
#     total = len(sections)
#     completed = sum(1 for v in sections.values() if v)
#     progress = int((completed / total) * 100) if total > 0 else 0
#     pending = [k for k, v in sections.items() if not v]
