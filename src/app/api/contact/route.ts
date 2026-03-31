import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

/**
 * POST /api/contact — Submit a contact form message.
 * Stores the message in Supabase for review.
 */
export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { name, email, message } = body;

  // Validate required fields
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "Name is required." },
      { status: 400 }
    );
  }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, error: "A valid email is required." },
      { status: 400 }
    );
  }
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "Message is required." },
      { status: 400 }
    );
  }

  // Enforce length limits
  const sanitised = {
    name: name.trim().slice(0, 200),
    email: email.trim().slice(0, 200),
    message: message.trim().slice(0, 5000),
  };

  // Store in Supabase (graceful degradation if table doesn't exist)
  const { error } = await supabaseAdmin
    .from("contact_submissions")
    .insert(sanitised);

  if (error) {
    // If the table doesn't exist, log but still return success to the user
    console.error("Failed to store contact submission:", error.message);
    // Fall through — we still acknowledge receipt to the user
  }

  return NextResponse.json(
    {
      success: true,
      message: "Thank you for your message! We'll get back to you soon.",
    },
    { status: 201 }
  );
}