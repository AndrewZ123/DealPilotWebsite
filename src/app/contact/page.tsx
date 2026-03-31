import { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with DealPilot. Reach out for partnership inquiries, affiliate opportunities, or general questions.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
      <p className="mt-2 text-gray-500">
        Have a question, partnership inquiry, or just want to say hello? We'd
        love to hear from you.
      </p>
      <ContactForm />
    </div>
  );
}