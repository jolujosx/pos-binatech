// @ts-nocheck

// <reference lib="deno.ns" />
//<reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface RequestBody {
  phone?: string;
  message?: string;
  businessName?: string;
}

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestBody: RequestBody = await req.json();
    const { phone, message, businessName } = requestBody;

    // Validate required fields
    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "Phone and message are required" } as WhatsAppResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get environment variables
    const whatsappToken: string | undefined = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneId: string | undefined = Deno.env.get("WHATSAPP_PHONE_ID");

    if (!whatsappToken || !phoneId) {
      return new Response(
        JSON.stringify({ error: "WhatsApp configuration missing" } as WhatsAppResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format phone number
    const formattedPhone: string = phone.startsWith("+") ? phone : `+${phone}`;

    // Send WhatsApp message
    const apiResponse: Response = await fetch(
      `https://graph.facebook.com/v17.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: {
            body: `🏪 *${businessName || "Tu Tienda"}*\n\n${message}\n\n✅ Gracias por su compra.`,
          },
        }),
      }
    );

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("WhatsApp API error:", data);
      throw new Error(data.error?.message || "Failed to send message");
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        messageId: data.messages?.[0]?.id,
      } as WhatsAppResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const error: unknown = err;
    console.error("Error in send-whatsapp function:", error);
    const errorMessage: string = error instanceof Error ? error.message : "Internal server error";
    
    return new Response(
      JSON.stringify({ error: errorMessage } as WhatsAppResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});