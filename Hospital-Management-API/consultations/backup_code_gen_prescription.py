import os
import io
import uuid
from datetime import datetime

from django.conf import settings
from django.http import FileResponse, HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle, Frame, PageTemplate
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.units import inch, cm
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import black, blue, red, green, HexColor
from reportlab.pdfgen import canvas
# from reportlab.lib.pagesizes import landscape # Not used, can be removed

# --- Global Data (for dummy content and easy modification) ---
CLINIC_NAME = "Doctor Endocrine Diabetes & Thyroid Clinic"
CLINIC_ADDRESS = "#102, Block A, Long Street 1, New Delhi-110 0001"
CLINIC_CONTACT = "Contact: +91-1254878550 | Email: drdavidkhan@example.com"

DOCTOR_NAME = "Dr. David Khan"
DOCTOR_QUALIFICATION = "MD. DM(Endocrinology)"
DOCTOR_REG_NO = "Reg no: 2011/03/0577"
DOCTOR_TITLE = "Consultant Diabetologist and Endocrinologist"
DOCTOR_CONTACT = "Email: drdavidkhan@example.com | Mobile: +91-9876543210"

PATIENT_NAME = "Mr. Srinivas Reddy"
PATIENT_AGE_GENDER = "66y, Male"
PRESCRIPTION_DATE = datetime.now().strftime("%Y-%m-%d")
PATIENT_HEIGHT = "167 cm"
PATIENT_WEIGHT = "55.3 kg"

# Extended Dummy Medicine Data for Pagination Testing (reverted to original large set)
MEDICINE_DATA = [
    ["1", "Paracetamol", "1-0-1", "5 Days", "Take after food"],
    ["2", "Ibuprofen", "0-1-1", "3 Days", "After meals"],
    ["3", "Vitamin D", "1-0-0", "30 Days", "Morning with milk"],
    ["4", "Amoxicillin", "1-1-1", "7 Days", "With food"],
    ["5", "Omeprazole", "1-0-0", "14 Days", "Before breakfast"],
    ["6", "Cetirizine", "0-0-1", "10 Days", "At bedtime"],
    ["7", "Metformin", "1-0-1", "Indefinite", "After dinner"],
    ["8", "Lisinopril", "1-0-0", "Indefinite", "Morning"],
    ["9", "Atorvastatin", "0-0-1", "Indefinite", "At night"],
    ["10", "Aspirin", "1-0-0", "Indefinite", "Daily"],
    ["11", "Prednisone", "1-0-0", "5 Days", "With food"],
    ["12", "Doxycycline", "1-0-0", "7 Days", "After food, avoid sun"],
    ["13", "Furosemide", "1-0-0", "Indefinite", "Morning"],
    ["14", "Warfarin", "0-0-1", "Indefinite", "Evening"],
    ["15", "Levothyroxine", "1-0-0", "Indefinite", "Morning on empty stomach"],
    ["16", "Gabapentin", "1-0-1", "Indefinite", "As directed"],
    ["17", "Tramadol", "1-1-1", "As needed", "With food"],
    ["18", "Hydrochlorothiazide", "1-0-0", "Indefinite", "Morning"],
    ["19", "Sertraline", "1-0-0", "Indefinite", "Morning or evening"],
    ["20", "Albuterol", "As needed", "As needed", "Inhaler"],
    ["21", "Ciprofloxacin", "1-0-1", "7 Days", "Avoid dairy"],
    ["22", "Fluoxetine", "1-0-0", "Indefinite", "Morning"],
    ["23", "Naproxen", "1-0-1", "As needed", "With food"],
    ["24", "Pantoprazole", "1-0-0", "30 Days", "Before breakfast"],
    ["25", "Tamsulosin", "0-0-1", "Indefinite", "After dinner"],
    ["26", "Duloxetine", "1-0-0", "Indefinite", "Morning"],
    ["27", "Clonazepam", "0-0-1", "As needed", "At bedtime"],
    ["28", "Meloxicam", "1-0-0", "As needed", "With food"],
    ["29", "Rosuvastatin", "0-0-1", "Indefinite", "At night"],
    ["30", "Escitalopram", "1-0-0", "Indefinite", "Morning or evening"],
]

ADVICE_ITEMS = [
    "Start walking 30 minutes daily.",
    "Avoid sweets and processed foods.",
    "Maintain a balanced diet with plenty of fruits and vegetables.",
    "Ensure adequate hydration throughout the day.",
    "Get at least 7-8 hours of quality sleep nightly.",
    "Limit screen time, especially before bed.",
    "Practice stress-reducing techniques like meditation or deep breathing.",
]

INVESTIGATIONS_ITEMS = [
    "Complete Blood Count (CBC)",
    "Liver Function Test (LFT)",
    "Kidney Function Test (KFT)",
    "Thyroid Stimulating Hormone (TSH)",
    "Urine Routine & Microscopy",
    "HbA1c (Glycated Hemoglobin)",
    "Electrolyte Panel",
    "C-Reactive Protein (CRP)",
]

DIAGNOSES_ITEMS = [
    "Common Cold (Confirmed - Head) : Patient is advised rest and hydration.",
    "Seasonal Allergy (Probable - Respiratory) : Avoid allergens.",
    "Type 2 Diabetes Mellitus (Controlled)",
    "Essential Hypertension (Mild)",
    "Dyslipidemia",
]

PACKAGES_ITEMS = [
    "Basic Health Package",
    "Diabetic Care Package",
    "Cardiac Screening Package",
]

FOLLOW_UP_DATE = "10-May-2025" # Dummy data for follow-up date

# --- Common Header/Footer Drawing Logic ---
def header_footer_template_common(canvas_obj, doc):
    """
    Draws the header and footer on each page. This function is called by
    on_first_page and on_later_pages.
    """
    print(f"DEBUG: header_footer_template_common called for page {doc.page}") # Debug print
    canvas_obj.saveState()
    styles = getSampleStyleSheet()

    # Define custom styles for header/footer content within the canvas (Font size increased by 1)
    styles.add(ParagraphStyle(name='ClinicHeaderCanvas', fontSize=17, leading=19, alignment=TA_LEFT, fontName='Helvetica-Bold', textColor=HexColor('#003366')))
    styles.add(ParagraphStyle(name='DoctorNameHeaderCanvas', fontSize=13, leading=15, alignment=TA_RIGHT, fontName='Helvetica-Bold', textColor=HexColor('#003366')))
    styles.add(ParagraphStyle(name='NormalLeftCanvas', fontSize=9, leading=10, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name='NormalRightCanvas', fontSize=9, leading=10, alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='FooterCanvas', fontSize=7, leading=9, alignment=TA_CENTER, textColor=HexColor('#666666')))

    # --- Header Content ---
    # Define the top Y coordinate for the header content.
    header_draw_start_y = A4[1] - (0.5 * inch) # Start 0.5 inch from the absolute top of the page

    # Clinic details (left)
    clinic_name_p = Paragraph(CLINIC_NAME, styles['ClinicHeaderCanvas'])
    clinic_address_p = Paragraph(CLINIC_ADDRESS, styles['NormalLeftCanvas'])
    clinic_contact_p = Paragraph(CLINIC_CONTACT, styles['NormalLeftCanvas'])

    # Doctor details (right)
    doctor_name_p = Paragraph(DOCTOR_NAME, styles['DoctorNameHeaderCanvas'])
    doctor_qualification_p = Paragraph(DOCTOR_QUALIFICATION, styles['NormalRightCanvas'])
    doctor_reg_no_p = Paragraph(DOCTOR_REG_NO, styles['NormalRightCanvas'])
    doctor_title_p = Paragraph(DOCTOR_TITLE, styles['NormalRightCanvas'])
    doctor_contact_p = Paragraph(DOCTOR_CONTACT, styles['NormalRightCanvas'])

    # Draw clinic details on left
    current_y_left = header_draw_start_y
    # Clinic Name
    w, h = clinic_name_p.wrapOn(canvas_obj, 4 * inch, 1 * inch)
    clinic_name_p.drawOn(canvas_obj, doc.leftMargin, current_y_left - h)
    current_y_left -= h + 0.05 * inch # Smaller spacer

    # Clinic Address
    w, h = clinic_address_p.wrapOn(canvas_obj, 4 * inch, 1 * inch)
    clinic_address_p.drawOn(canvas_obj, doc.leftMargin, current_y_left - h)
    current_y_left -= h + 0.05 * inch # Smaller spacer

    # Clinic Contact
    w, h = clinic_contact_p.wrapOn(canvas_obj, 4 * inch, 1 * inch)
    clinic_contact_p.drawOn(canvas_obj, doc.leftMargin, current_y_left - h)

    # Draw doctor details on right
    current_y_right = header_draw_start_y
    # Doctor Name
    w, h = doctor_name_p.wrapOn(canvas_obj, 3 * inch, 1 * inch)
    doctor_name_p.drawOn(canvas_obj, A4[0] - doc.rightMargin - 3 * inch, current_y_right - h)
    current_y_right -= h + 0.05 * inch # Smaller spacer

    # Doctor Qualification
    w, h = doctor_qualification_p.wrapOn(canvas_obj, 3 * inch, 1 * inch)
    doctor_qualification_p.drawOn(canvas_obj, A4[0] - doc.rightMargin - 3 * inch, current_y_right - h)
    current_y_right -= h + 0.05 * inch # Smaller spacer

    # Doctor Reg No
    w, h = doctor_reg_no_p.wrapOn(canvas_obj, 3 * inch, 1 * inch)
    doctor_reg_no_p.drawOn(canvas_obj, A4[0] - doc.rightMargin - 3 * inch, current_y_right - h)
    current_y_right -= h + 0.05 * inch # Smaller spacer

    # Doctor Title
    w, h = doctor_title_p.wrapOn(canvas_obj, 3 * inch, 1 * inch)
    doctor_title_p.drawOn(canvas_obj, A4[0] - doc.rightMargin - 3 * inch, current_y_right - h)
    current_y_right -= h + 0.05 * inch # Smaller spacer

    # Doctor Contact
    w, h = doctor_contact_p.wrapOn(canvas_obj, 3 * inch, 1 * inch)
    doctor_contact_p.drawOn(canvas_obj, A4[0] - doc.rightMargin - 3 * inch, current_y_right - h)


    # --- Footer Content ---
    # Define the bottom Y coordinate for the footer content.
    footer_draw_start_y = 0.75 * inch # Start 0.75 inch from the absolute bottom of the page

    footer_text_p = Paragraph("This is a digitally signed prescription. Powered by DoctorProCare.com", styles['FooterCanvas'])
    emergency_contact_p = Paragraph("In case of emergency, contact: emergency@example.com or +91-9988776655", styles['FooterCanvas'])
    page_number_text = f"Page {doc.page}"

    # Draw emergency contact first (lower)
    w, h = emergency_contact_p.wrapOn(canvas_obj, A4[0] - doc.leftMargin - doc.rightMargin, 1 * inch)
    emergency_contact_p.drawOn(canvas_obj, doc.leftMargin, footer_draw_start_y)
    
    # Draw footer text above emergency contact
    w, h_footer_text = footer_text_p.wrapOn(canvas_obj, A4[0] - doc.leftMargin - doc.rightMargin, 1 * inch)
    footer_text_p.drawOn(canvas_obj, doc.leftMargin, footer_draw_start_y + h + 0.1 * inch) # 0.1 inch spacer

    # Page number (centered below other footer text) (Font size increased by 1)
    canvas_obj.setFont('Helvetica', 7) # Ensure font is set right before drawing
    canvas_obj.drawCentredString(A4[0] / 2.0, 0.3 * inch, page_number_text) # Fixed position from bottom

    canvas_obj.restoreState()

# --- Page callback functions for SimpleDocTemplate ---
def on_first_page(canvas_obj, doc):
    """Callback for the first page."""
    header_footer_template_common(canvas_obj, doc)

def on_later_pages(canvas_obj, doc):
    """Callback for all subsequent pages."""
    header_footer_template_common(canvas_obj, doc)

# --- Helper function to generate PDF content ---
def generate_prescription_pdf_content(buffer):
    """
    Generates the PDF content using ReportLab with dummy data.
    The layout is adjusted to ensure all content fits on a single A4 page
    with appropriate spacing for printing.
    """
    # Set generous margins in SimpleDocTemplate to make space for header/footer drawn by onPage
    # These margins define the *flowable content area*. The onPage function draws *outside* this.
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=72, leftMargin=72,
                            topMargin=180, # Increased top margin to give ample space for header content and padding
                            bottomMargin=120) # Increased bottom margin to give ample space for footer content and padding
    styles = getSampleStyleSheet()

    # Custom styles with optimized leading (line spacing) and increased font size by 1
    styles.add(ParagraphStyle(name='NormalLeft', fontSize=9, leading=10, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name='BoldLeft', fontSize=9, leading=10, alignment=TA_LEFT, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='Small', fontSize=7, leading=8, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name='NormalRight', fontSize=9, leading=10, alignment=TA_RIGHT))

    styles.add(ParagraphStyle(name='SectionHeader', fontSize=11, leading=13, alignment=TA_LEFT, fontName='Helvetica-Bold', textColor=HexColor('#336699')))

    styles.add(ParagraphStyle(name='MedicineTableHeader', fontSize=9, leading=10, alignment=TA_CENTER, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='MedicineTableCell', fontSize=8, leading=9, alignment=TA_LEFT))

    styles.add(ParagraphStyle(name='ListItem', fontSize=9, leading=11, alignment=TA_LEFT))

    # Define the main story for the document
    Story = []

    # --- Patient Details ---
    patient_data = [
        [Paragraph(f"<b>Patient:</b> {PATIENT_NAME} ({PATIENT_AGE_GENDER})", styles['BoldLeft']),
         Paragraph(f"<b>Date:</b> {PRESCRIPTION_DATE}", styles['BoldLeft'])],
        [Paragraph(f"<b>Height:</b> {PATIENT_HEIGHT}", styles['BoldLeft']),
         Paragraph(f"<b>Weight:</b> {PATIENT_WEIGHT}", styles['BoldLeft'])]
    ]
    patient_table = Table(patient_data, colWidths=[4.0 * inch, 3.0 * inch])
    patient_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    Story.append(patient_table)
    Story.append(Spacer(1, 0.1 * inch))

    # --- Rx (Medicines) Section ---
    Story.append(Paragraph("<u>Rx</u>", styles['SectionHeader']))
    Story.append(Spacer(1, 0.05 * inch))

    # Prepare medicine table data
    medicine_table_data = [
        [Paragraph("#", styles['MedicineTableHeader']),
         Paragraph("Medicine", styles['MedicineTableHeader']),
         Paragraph("Dosage", styles['MedicineTableHeader']),
         Paragraph("Duration", styles['MedicineTableHeader']),
         Paragraph("Instructions", styles['MedicineTableHeader'])]
    ]
    for i, med in enumerate(MEDICINE_DATA):
        medicine_table_data.append([
            Paragraph(str(i+1), styles['MedicineTableCell']),
            Paragraph(med[1], styles['MedicineTableCell']),
            Paragraph(med[2], styles['MedicineTableCell']),
            Paragraph(med[3], styles['MedicineTableCell']),
            Paragraph(med[4], styles['MedicineTableCell'])
        ])

    medicine_table = Table(medicine_table_data, colWidths=[0.5*inch, 2.0*inch, 1.0*inch, 1.0*inch, 2.5*inch])
    medicine_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#E0E0E0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), black),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (1, 1), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), HexColor('#F5F5F5')),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#CCCCCC')),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    Story.append(medicine_table)
    Story.append(Spacer(1, 0.2 * inch))

    # --- Advice Section ---
    Story.append(Paragraph("<u>Advice</u>", styles['SectionHeader']))
    Story.append(Spacer(1, 0.05 * inch))
    for item in ADVICE_ITEMS:
        Story.append(Paragraph(f"• {item}", styles['ListItem']))
    Story.append(Spacer(1, 0.2 * inch))

    # --- Investigations / Tests Recommended Section ---
    Story.append(Paragraph("<u>Investigations / Tests Recommended</u>", styles['SectionHeader']))
    Story.append(Spacer(1, 0.05 * inch))
    for item in INVESTIGATIONS_ITEMS:
        Story.append(Paragraph(f"• {item}", styles['ListItem']))
    Story.append(Spacer(1, 0.2 * inch))

    # --- Diagnoses Section ---
    Story.append(Paragraph("<u>Diagnoses</u>", styles['SectionHeader']))
    Story.append(Spacer(1, 0.05 * inch))
    for item in DIAGNOSES_ITEMS:
        Story.append(Paragraph(f"• {item}", styles['ListItem']))
    Story.append(Spacer(1, 0.2 * inch))

    # --- Packages Section ---
    Story.append(Paragraph("<u>Packages</u>", styles['SectionHeader']))
    Story.append(Spacer(1, 0.05 * inch))
    for item in PACKAGES_ITEMS:
        Story.append(Paragraph(f"• {item}", styles['ListItem']))
    Story.append(Spacer(1, 0.2 * inch))

    # --- Follow-up Date ---
    Story.append(Paragraph(f"<b>Follow-up Date:</b> {FOLLOW_UP_DATE}", styles['BoldLeft']))
    Story.append(Spacer(1, 0.3 * inch))

    # --- Doctor Signature (appears on the last page of content) ---
    Story.append(Paragraph(f"<b>{DOCTOR_NAME}</b>", styles['BoldLeft']))
    Story.append(Paragraph(f"Date: {PRESCRIPTION_DATE}", styles['NormalLeft']))

    # --- Build the document with custom page callbacks ---
    # Removed PageTemplate and Frame setup as onFirstPage/onLaterPages are used directly
    doc.build(Story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    return buffer

# --- Django REST Framework View ---
class GeneratePrescriptionPDFView(APIView):
    """
    API view to generate a PDF prescription and save it to the media folder.
    """
    def post(self, request, *args, **kwargs):
        try:
            # Create a buffer to hold the PDF
            buffer = io.BytesIO()

            # Generate the PDF content into the buffer
            generate_prescription_pdf_content(buffer)

            # Rewind the buffer's file pointer to the beginning
            buffer.seek(0)

            # Create a unique filename for the PDF
            pdf_filename = f"prescription_{uuid.uuid4().hex}.pdf"
            pdf_path = os.path.join(settings.MEDIA_ROOT, 'prescriptions', pdf_filename)

            # Ensure the prescriptions directory exists within MEDIA_ROOT
            os.makedirs(os.path.dirname(pdf_path), exist_ok=True)

            # Save the PDF to the media folder
            with open(pdf_path, 'wb') as f:
                f.write(buffer.getvalue())

            # Construct the URL for the saved PDF
            pdf_url = f"{settings.MEDIA_URL}prescriptions/{pdf_filename}"

            return Response({
                "status": "success",
                "message": "PDF generated and saved successfully.",
                "pdf_filename": pdf_filename,
                "pdf_url": pdf_url
            }, status=status.HTTP_200_OK)

        except Exception as e:
            # Log the error for debugging purposes
            print(f"Error generating PDF: {e}")
            return Response({
                "status": "error",
                "message": f"Failed to generate PDF: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
