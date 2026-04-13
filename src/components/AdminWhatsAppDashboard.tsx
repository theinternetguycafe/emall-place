import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Package,
  MessageSquare,
  Truck,
  CreditCard,
  Activity,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Order {
  id: string;
  buyer_phone: string;
  total_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
  products?: { title: string };
}

interface Conversation {
  id: string;
  buyer_phone: string;
  state: string;
  created_at: string;
  last_message_at: string;
}

interface Delivery {
  id: string;
  order_id: string;
  driver_phone?: string;
  status: string;
  created_at: string;
}

interface Payment {
  id: string;
  order_id: string;
  provider: string;
  status: string;
  amount?: number;
  created_at: string;
}

interface SystemLog {
  id: string;
  log_type: string;
  reference_id: string;
  actor_type: string;
  actor_phone?: string;
  message: string;
  created_at: string;
}

export function AdminWhatsAppDashboard() {
  const [activeTab, setActiveTab] = useState<
    "orders" | "conversations" | "deliveries" | "payments" | "dispatch" | "logs"
  >("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dispatchRequests, setDispatchRequests] = useState<any[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    paidOrders: 0,
    deliveryPending: 0,
    activeConversations: 0,
  });

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    // Fetch orders
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, products(title)")
      .eq("buyer_phone", "!null") // WhatsApp orders only
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch conversations
    const { data: convsData } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(50);

    // Fetch deliveries
    const { data: delivsData } = await supabase
      .from("whatsapp_deliveries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch payments
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("*")
      .eq("provider", "payfast")
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch dispatch requests
    const { data: dispatchData } = await supabase
      .from("whatsapp_dispatch_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch logs
    const { data: logsData } = await supabase
      .from("whatsapp_system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    setOrders(ordersData || []);
    setConversations(convsData || []);
    setDeliveries(delivsData || []);
    setPayments(paymentsData || []);
    setDispatchRequests(dispatchData || []);
    setLogs(logsData || []);

    // Calculate stats
    const paidCount = (ordersData || []).filter(
      (o) => o.payment_status === "paid"
    ).length;
    const deliveryPending = (delivsData || []).filter(
      (d) => d.status === "pending"
    ).length;
    const activeConvs = (convsData || []).filter(
      (c) => c.state !== "COMPLETED"
    ).length;

    setStats({
      totalOrders: ordersData?.length || 0,
      paidOrders: paidCount,
      deliveryPending,
      activeConversations: activeConvs,
    });

    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-4">📱 WhatsApp Commerce Hub</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={Package}
            color="blue"
          />
          <StatCard
            title="Paid Orders"
            value={stats.paidOrders}
            icon={CreditCard}
            color="green"
          />
          <StatCard
            title="Pending Deliveries"
            value={stats.deliveryPending}
            icon={Truck}
            color="orange"
          />
          <StatCard
            title="Active Conversations"
            value={stats.activeConversations}
            icon={MessageSquare}
            color="purple"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 flex gap-2 overflow-x-auto">
        {(
          [
            "orders",
            "conversations",
            "deliveries",
            "payments",
            "dispatch",
            "logs",
          ] as const
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium whitespace-nowrap transition ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {loading && (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        )}

        {/* ORDERS */}
        {activeTab === "orders" && !loading && (
          <div className="p-6">
            {orders.length === 0 ? (
              <p className="text-gray-500">No orders found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Buyer</th>
                      <th className="text-left p-3">Product</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">Payment</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{order.buyer_phone}</td>
                        <td className="p-3">{order.products?.title}</td>
                        <td className="p-3 text-right font-bold">
                          R{order.total_amount.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <Badge
                            text={order.payment_status}
                            color={
                              order.payment_status === "paid" ? "green" : "red"
                            }
                          />
                        </td>
                        <td className="p-3">
                          <Badge text={order.status} color="blue" />
                        </td>
                        <td className="p-3 text-xs">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONVERSATIONS */}
        {activeTab === "conversations" && !loading && (
          <div className="p-6 space-y-3">
            {conversations.length === 0 ? (
              <p className="text-gray-500">No conversations</p>
            ) : (
              conversations.map((conv) => (
                <ConversationRow key={conv.id} conversation={conv} />
              ))
            )}
          </div>
        )}

        {/* DELIVERIES */}
        {activeTab === "deliveries" && !loading && (
          <div className="p-6 space-y-3">
            {deliveries.length === 0 ? (
              <p className="text-gray-500">No deliveries</p>
            ) : (
              deliveries.map((delivery) => (
                <DeliveryRow key={delivery.id} delivery={delivery} />
              ))
            )}
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === "payments" && !loading && (
          <div className="p-6 space-y-3">
            {payments.length === 0 ? (
              <p className="text-gray-500">No payments</p>
            ) : (
              payments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))
            )}
          </div>
        )}

        {/* DISPATCH */}
        {activeTab === "dispatch" && !loading && (
          <div className="p-6 space-y-3">
            {dispatchRequests.length === 0 ? (
              <p className="text-gray-500">No dispatch requests</p>
            ) : (
              dispatchRequests.map((req) => (
                <DispatchRow key={req.id} dispatchRequest={req} />
              ))
            )}
          </div>
        )}

        {/* LOGS */}
        {activeTab === "logs" && !loading && (
          <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs</p>
            ) : (
              logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Helper Components
// ============================================================

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-70">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon size={32} className="opacity-20" />
      </div>
    </div>
  );
}

function Badge({
  text,
  color,
}: {
  text: string;
  color: "blue" | "green" | "red" | "yellow" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-800",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded ${
        colorClasses[color]
      }`}
    >
      {text.toUpperCase()}
    </span>
  );
}

function ConversationRow({ conversation }: { conversation: Conversation }) {
  return (
    <div className="p-3 border rounded-lg flex justify-between items-center">
      <div>
        <p className="font-semibold">{conversation.buyer_phone}</p>
        <p className="text-xs text-gray-500">
          State: {conversation.state.replace(/_/g, " ")}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-500">
          {new Date(conversation.last_message_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function DeliveryRow({ delivery }: { delivery: Delivery }) {
  const statusIcon =
    delivery.status === "delivered" ? (
      <CheckCircle className="text-green-600" size={16} />
    ) : delivery.status === "pending" ? (
      <Clock className="text-orange-600" size={16} />
    ) : (
      <Activity className="text-blue-600" size={16} />
    );

  return (
    <div className="p-3 border rounded-lg flex justify-between items-center">
      <div className="flex items-center gap-3">
        {statusIcon}
        <div>
          <p className="font-semibold">Order {delivery.order_id.slice(0, 8)}</p>
          <p className="text-xs text-gray-500">Driver: {delivery.driver_phone}</p>
        </div>
      </div>
      <Badge text={delivery.status} color="blue" />
    </div>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <div className="p-3 border rounded-lg flex justify-between items-center">
      <div>
        <p className="font-semibold">Order {payment.order_id.slice(0, 8)}</p>
        <p className="text-xs text-gray-500">{payment.provider.toUpperCase()}</p>
      </div>
      <div className="text-right flex items-center gap-3">
        {payment.amount && (
          <p className="font-bold">R{payment.amount.toFixed(2)}</p>
        )}
        <Badge
          text={payment.status}
          color={payment.status === "success" ? "green" : "yellow"}
        />
      </div>
    </div>
  );
}

function DispatchRow({ dispatchRequest }: { dispatchRequest: any }) {
  return (
    <div className="p-3 border rounded-lg flex justify-between items-center">
      <div>
        <p className="font-semibold">
          Order {dispatchRequest.order_id.slice(0, 8)}
        </p>
        <p className="text-xs text-gray-500">
          Broadcasts: {dispatchRequest.broadcast_count}
        </p>
      </div>
      <Badge
        text={dispatchRequest.status}
        color={
          dispatchRequest.status === "accepted"
            ? "green"
            : dispatchRequest.status === "waiting"
              ? "orange"
              : "red"
        }
      />
    </div>
  );
}

function LogRow({ log }: { log: SystemLog }) {
  const typeIcon = {
    conversation_created: <MessageSquare size={14} />,
    message_sent: <MessageSquare size={14} />,
    order_created: <Package size={14} />,
    payment_received: <CreditCard size={14} />,
    driver_assigned: <Truck size={14} />,
    delivery_completed: <CheckCircle size={14} />,
    error: <AlertCircle size={14} />,
  };

  return (
    <div className="p-2 border-l-4 border-gray-300 bg-gray-50 rounded text-xs">
      <div className="flex items-center gap-2 mb-1">
        {typeIcon[log.log_type as keyof typeof typeIcon] || <Activity size={14} />}
        <span className="font-medium">{log.log_type.replace(/_/g, " ")}</span>
        <span className="text-gray-500">
          {new Date(log.created_at).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-gray-700 ml-4">{log.message}</p>
    </div>
  );
}
