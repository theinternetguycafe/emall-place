import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Package, TrendingUp, Phone, Clock, MapPin } from "lucide-react";

interface Lead {
  id: string;
  buyer_phone: string;
  product_id: string;
  state: string;
  created_at: string;
  last_message_at: string;
}

interface Order {
  id: string;
  buyer_phone: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  products?: { title: string };
}

interface Message {
  id: string;
  conversation_id: string;
  sender: string;
  message: string;
  created_at: string;
}

export function WhatsAppDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"leads" | "orders" | "messages">("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Get seller profile ID
  const [sellerId, setSellerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchSellerProfile();
  }, [user]);

  useEffect(() => {
    if (!sellerId) return;
    if (activeTab === "leads") fetchLeads();
    else if (activeTab === "orders") fetchOrders();
    else if (activeTab === "messages") fetchMessages();
  }, [activeTab, sellerId]);

  const fetchSellerProfile = async () => {
    const { data: seller } = await supabase
      .from("seller_profiles")
      .select("id")
      .eq("user_id", user?.id)
      .single();
    if (seller) setSellerId(seller.id);
  };

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("state", "WAITING_FOR_SELLER")
      .order("last_message_at", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, products(title)")
      .eq("seller_id", sellerId)
      .eq("buyer_phone", "!null") // WhatsApp orders
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data: conversations } = await supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("seller_id", sellerId);

    if (conversations && conversations.length > 0) {
      const convIds = conversations.map((c) => c.id);
      const { data: msgs } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(50);
      setMessages(msgs || []);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">📱 WhatsApp Commerce</h2>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("leads")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "leads"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600"
          }`}
        >
          <TrendingUp className="inline mr-2" size={18} />
          Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "orders"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600"
          }`}
        >
          <Package className="inline mr-2" size={18} />
          Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "messages"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600"
          }`}
        >
          <MessageSquare className="inline mr-2" size={18} />
          Messages
        </button>
      </div>

      {/* Tab Content */}
      {loading && <p className="text-gray-500">Loading...</p>}

      {/* LEADS TAB */}
      {activeTab === "leads" && !loading && (
        <div className="space-y-4">
          {leads.length === 0 ? (
            <p className="text-gray-500">No pending inquiries</p>
          ) : (
            leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onRespond={() => fetchLeads()} />
            ))
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === "orders" && !loading && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <p className="text-gray-500">No WhatsApp orders yet</p>
          ) : (
            orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </div>
      )}

      {/* MESSAGES TAB */}
      {activeTab === "messages" && !loading && (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet</p>
          ) : (
            messages.map((msg) => (
              <MessageCard key={msg.id} message={msg} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Lead Card Component
// ============================================================
function LeadCard({ lead, onRespond }: { lead: Lead; onRespond: () => void }) {
  const [response, setResponse] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendResponse = async () => {
    if (!response.trim()) return;
    setSending(true);

    // Store message
    await supabase.from("whatsapp_messages").insert({
      conversation_id: lead.id,
      sender: "seller",
      message: response,
      message_type: "text",
    });

    // Update conversation state
    await supabase
      .from("whatsapp_conversations")
      .update({ state: "CHOOSING_ACTION" })
      .eq("id", lead.id);

    setResponse("");
    setSending(false);
    onRespond();
  };

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold flex items-center gap-2">
            <Phone size={16} />
            {lead.buyer_phone}
          </p>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Clock size={14} />
            {new Date(lead.last_message_at).toLocaleTimeString()}
          </p>
        </div>
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
          {lead.state.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-3">
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Type your response..."
          className="w-full p-2 border rounded text-sm"
          rows={2}
        />
        <button
          onClick={handleSendResponse}
          disabled={sending || !response.trim()}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
        >
          {sending ? "Sending..." : "Send Response"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Order Card Component
// ============================================================
function OrderCard({ order }: { order: Order }) {
  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold">{order.products?.title || "Product"}</p>
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Phone size={14} />
            {order.buyer_phone}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold">R{order.total_amount.toFixed(2)}</p>
          <div className="flex gap-2 mt-1">
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${
                order.payment_status === "paid"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {order.payment_status.toUpperCase()}
            </span>
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${
                order.status === "completed"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {order.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        {new Date(order.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}

// ============================================================
// Message Card Component
// ============================================================
function MessageCard({ message }: { message: Message }) {
  return (
    <div
      className={`p-3 rounded-lg ${
        message.sender === "seller"
          ? "bg-blue-50 border-l-4 border-blue-500 ml-4"
          : "bg-gray-50 border-l-4 border-gray-500 mr-4"
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <p className="font-medium text-sm">{message.sender.toUpperCase()}</p>
        <p className="text-xs text-gray-500">
          {new Date(message.created_at).toLocaleTimeString()}
        </p>
      </div>
      <p className="text-sm">{message.message}</p>
    </div>
  );
}
