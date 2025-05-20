from django.template.loader import get_template
from weasyprint import HTML
from django.conf import settings
import os

def render_pdf(template_name, context, output_path):
    print("Render pdf function called")
    template = get_template(template_name)
    html_out = template.render(context)
    pdf_file = HTML(string=html_out, base_url=settings.BASE_DIR).write_pdf()
    with open(output_path, 'wb') as f:
        f.write(pdf_file)