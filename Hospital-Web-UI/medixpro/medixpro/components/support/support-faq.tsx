"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    id: "faq-1",
    question: "How do I reset my password?",
    answer:
      "To reset your password, click on the 'Forgot Password' link on the login page. Enter your email address, and we'll send you a link to reset your password. Follow the instructions in the email to create a new password.",
  },
  {
    id: "faq-2",
    question: "How can I add a new patient to the system?",
    answer:
      "To add a new patient, navigate to the Patients section from the sidebar, then click on the 'Add Patient' button. Fill out the required information in the form and click 'Save' to create the patient record.",
  },
  {
    id: "faq-3",
    question: "How do I schedule an appointment?",
    answer:
      "To schedule an appointment, go to the Appointments section and click 'Add Appointment'. Select the patient, doctor, date, time, and appointment type. You can also add notes or specific instructions before saving the appointment.",
  },
  {
    id: "faq-4",
    question: "Can I export patient data?",
    answer:
      "Yes, you can export patient data. Navigate to the Patients section, select the patients you want to export, then click the 'Export' button. You can choose between CSV, Excel, or PDF formats depending on your needs.",
  },
  {
    id: "faq-5",
    question: "How do I generate billing reports?",
    answer:
      "To generate billing reports, go to the Reports section and select 'Financial Reports'. You can filter by date range, department, or service type. Click 'Generate Report' to create the report, which can then be viewed, printed, or exported.",
  },
  {
    id: "faq-6",
    question: "How can I manage staff schedules?",
    answer:
      "Staff schedules can be managed in the Staff section. Select a staff member and click on 'Schedule'. You can set regular working hours, add exceptions, and manage time off requests. The system will automatically check for conflicts.",
  },
  {
    id: "faq-7",
    question: "What should I do if I encounter an error?",
    answer:
      "If you encounter an error, first try refreshing the page. If the error persists, note the error message and the actions you were taking when it occurred. Submit a support ticket with these details so our team can assist you.",
  },
  {
    id: "faq-8",
    question: "How do I update patient insurance information?",
    answer:
      "To update insurance information, go to the patient's profile, click on the 'Insurance' tab, and select 'Edit'. Update the necessary fields and save the changes. The system will automatically apply the new insurance information to future billing.",
  },
  {
    id: "faq-9",
    question: "Can I customize the dashboard?",
    answer:
      "Yes, you can customize your dashboard. Click on the settings icon in the top-right corner of the dashboard and select 'Customize Dashboard'. You can add, remove, or rearrange widgets based on your preferences and role.",
  },
  {
    id: "faq-10",
    question: "How do I set up automated appointment reminders?",
    answer:
      "Automated reminders can be configured in the Settings section under 'Notifications'. You can set up email, SMS, or in-app reminders, and specify how far in advance they should be sent. You can also customize the reminder message.",
  },
]

export function SupportFAQ() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequently Asked Questions</CardTitle>
        <CardDescription>Find answers to common questions about using the clinic management system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-6">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search FAQs..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredFAQs.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {filteredFAQs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No FAQs found matching your search</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
