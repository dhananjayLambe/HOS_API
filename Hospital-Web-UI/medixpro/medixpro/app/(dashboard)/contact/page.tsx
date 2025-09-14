"use client";

import { ContactList } from "@/components/contacts/contact-list";
import { CreateContactModal } from "@/components/contacts/create-contact-modal";
import { Pagination } from "@/components/contacts/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Plus, Search } from "lucide-react";
import { useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { toast } from "sonner";

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  category: string;
  createdAt: string | Date;
}

// Mock data for contacts
const mockContacts: Contact[] = Array.from({ length: 50 }).map((_, i) => ({
  id: `contact-${i + 1}`,
  name: `Contact ${i + 1}`,
  email: `contact${i + 1}@example.com`,
  phone: `+1 (555) ${100 + i}-${1000 + i}`,
  company: `Company ${Math.floor(i / 5) + 1}`,
  position: ["Manager", "Director", "Assistant", "Specialist", "Coordinator"][i % 5],
  category: ["Client", "Vendor", "Partner", "Employee", "Other"][i % 5],
  createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
}));

export default function ContactsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [contactsPerPage] = useState(10);
  const [contacts, setContacts] = useState(mockContacts);

  // Filter contacts based on search query and category
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || contact.email.toLowerCase().includes(searchQuery.toLowerCase()) || contact.phone.toLowerCase().includes(searchQuery.toLowerCase()) || contact.company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "all" || contact.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Get current contacts for pagination
  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);
  const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);

  // Handle contact creation
  const handleCreateContact = (newContact: Omit<Contact, "id" | "createdAt">) => {
    setContacts([
      {
        id: `contact-${contacts.length + 1}`,
        createdAt: new Date().toISOString(),
        ...newContact,
      },
      ...contacts,
    ]);
    setIsCreateModalOpen(false);
  };

  // Handle contact update
  const handleUpdateContact = (updatedContact: Contact) => {
    setContacts(contacts.map((contact) => (contact.id === updatedContact.id ? updatedContact : contact)));
    toast.success(`${updatedContact.name} has been updated successfully.`);
  };

  // Handle contact deletion
  const handleDeleteContact = (contactId: string) => {
    const contactToDelete = contacts.find((contact) => contact.id === contactId);
    setContacts(contacts.filter((contact) => contact.id !== contactId));
    toast.success(`${contactToDelete?.name} has been deleted successfully.`);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4">
          <div className="flex flex-1 items-center gap-3 flex-wrap">
            <div className="relative flex-1 shrink-0 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search contacts..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Client">Client</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                  <SelectItem value="Partner">Partner</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export XLSX
          </Button>
        </div>

        <div className="mt-4">
          <ContactList contacts={currentContacts} onUpdate={handleUpdateContact} onDelete={handleDeleteContact} />
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <CreateContactModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateContact} />
    </DndProvider>
  );
}
