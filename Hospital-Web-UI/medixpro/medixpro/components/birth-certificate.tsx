import { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button"; // Update path if needed
import { ChevronLeft, Printer, Download } from "lucide-react";

const BirthCertificate = ({ record, setShowCertificate }: { record: any; setShowCertificate: any }) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  const downloadAsPDF = async ({ record }: { record: any }) => {
    if (!certificateRef.current) return;

    // Wait a tiny bit to make sure everything is rendered
    await new Promise((resolve) => setTimeout(resolve, 300));

    const canvas = await html2canvas(certificateRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      allowTaint: true,
      foreignObjectRendering: true,
    });

    const imgData = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10; // Start a little lower for top margin

    pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`birth-certificate-${record.id}.pdf`);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <>
      {/* Top buttons */}
      <div className="flex items-center flex-wrap gap-3 justify-between mb-6 print:hidden">
        <Button variant="outline" onClick={() => setShowCertificate(false)}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Details
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrintCertificate}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={() => downloadAsPDF({ record })}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Certificate content */}
      <div className="flex flex-col items-center">
        <div
          ref={certificateRef}
          className="w-full max-w-4xl p-4 xl:p-8 border-4 border-gray-300 dark:border-gray-900 bg-white dark:bg-gray-900"
          style={{
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundBlendMode: "lighten",
          }}
        >
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold">🏥</span>
              </div>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-wider mb-1">Certificate of Birth</h2>
            <p className="text-lg dark:text-gray-300">Official Birth Registration</p>
            <div className="mt-2 text-sm dark:text-gray-300">Certificate Number: {record.certificateNumber}</div>
          </div>

          <div className="border-t-2 border-b-2 border-gray-300 dark:border-gray-700 py-6 my-6">
            <h2 className="text-xl font-bold mb-4 text-center">Child Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Full Name</p>
                <p className="text-lg font-semibold">{record.childName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Gender</p>
                <p className="text-lg">{record.gender}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                <p className="text-lg">{new Date(record.dateOfBirth).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Time of Birth</p>
                <p className="text-lg">{record.timeOfBirth}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Place of Birth</p>
                <p className="text-lg">{record.placeOfBirth}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Weight & Length</p>
                <p className="text-lg">
                  {record.weight}, {record.length}
                </p>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4 text-center">Parents Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Mother's Name</p>
                <p className="text-lg">{record.motherName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Father's Name</p>
                <p className="text-lg">{record.fatherName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Mother's Nationality</p>
                <p className="text-lg">{record.motherNationality}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Father's Nationality</p>
                <p className="text-lg">{record.fatherNationality}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 text-center">Medical Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Attending Doctor</p>
                <p className="text-lg">{record.attendingDoctor}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Hospital/Facility</p>
                <p className="text-lg">{record.hospital}</p>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-300 dark:border-gray-700 pt-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="h-20 flex items-end justify-center">
                  <div className="border-t border-black w-48"></div>
                </div>
                <p className="text-sm font-medium">Registrar's Signature</p>
              </div>
              <div className="text-center">
                <div className="h-20 flex items-end justify-center">
                  <div className="border-t border-black w-48"></div>
                </div>
                <p className="text-sm font-medium">Official Seal</p>
              </div>
            </div>
            <div className="text-center mt-6">
              <p className="text-sm text-gray-500">
                Registered on {new Date(record.registrationDate).toLocaleDateString()} in accordance with the Civil Registry Law
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This certificate is an official document and any alteration or falsification is punishable by law
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BirthCertificate;
