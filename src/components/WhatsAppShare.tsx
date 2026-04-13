import React from "react";
import { MessageCircle, Copy, Check } from "lucide-react";

// Central bot number — reads from Vite env var
const DEFAULT_BOT_PHONE = (import.meta.env.VITE_BOT_PHONE as string | undefined) || "+27000000000";

interface WhatsAppShareProps {
  productId: string;
  productTitle: string;
  botPhone?: string;
}

/**
 * WhatsApp Share Component
 * Generates centralized bot WhatsApp links instead of seller-specific numbers
 * Format: wa.me/{BOT_NUMBER}?text=Hi%20(ID:{productId})
 */
export function WhatsAppShare({
  productId,
  productTitle,
  botPhone = DEFAULT_BOT_PHONE,
}: WhatsAppShareProps) {
  const [copied, setCopied] = React.useState(false);

  // Generate WhatsApp link with product reference
  const generateWhatsAppLink = (): string => {
    const message = `Hi (ID:${productId})`;
    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = botPhone.replace(/\D/g, "");
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  };

  const whatsappLink = generateWhatsAppLink();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(whatsappLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    window.open(whatsappLink, "_blank");
  };

  return (
    <div className="flex gap-2">
      {/* Primary WhatsApp Button */}
      <button
        onClick={handleOpenWhatsApp}
        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        title={`Chat with our bot about ${productTitle}`}
      >
        <MessageCircle size={18} />
        <span className="hidden sm:inline">Ask via WhatsApp</span>
        <span className="sm:hidden">WhatsApp</span>
      </button>

      {/* Copy Link Button */}
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
        title="Copy WhatsApp link"
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
        <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
      </button>
    </div>
  );
}

/**
 * WhatsApp Share Card
 * Full card component for product pages
 */
export function WhatsAppShareCard({
  productId,
  productTitle,
  productPrice,
  productImage,
  botPhone,
}: WhatsAppShareProps & {
  productPrice?: number;
  productImage?: string;
}) {
  const whatsappLink = `https://wa.me/${(botPhone || DEFAULT_BOT_PHONE)
    .replace(/\D/g, "")}?text=${encodeURIComponent(`Hi (ID:${productId})`)}`;

  return (
    <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="text-green-600" size={24} />
        <h3 className="text-xl font-bold text-gray-800">Quick Inquiry</h3>
      </div>

      <p className="text-gray-700 mb-4">
        Chat instantly with us about <span className="font-semibold">{productTitle}</span>
      </p>

      {productPrice && (
        <div className="mb-4 p-3 bg-white rounded-lg border border-green-200">
          <p className="text-sm text-gray-600">Price</p>
          <p className="text-2xl font-bold text-green-600">R{productPrice.toFixed(2)}</p>
        </div>
      )}

      <div className="space-y-2">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <MessageCircle size={20} />
          Start Chat on WhatsApp
        </a>

        <p className="text-xs text-gray-600 text-center">
          💬 Our team responds within minutes
        </p>
      </div>
    </div>
  );
}

/**
 * Inline WhatsApp Share Component for Product Lists
 */
export function ProductWhatsAppBadge({
  productId,
  productTitle,
  botPhone,
}: WhatsAppShareProps) {
  const whatsappLink = `https://wa.me/${(botPhone || DEFAULT_BOT_PHONE)
    .replace(/\D/g, "")}?text=${encodeURIComponent(`Hi (ID:${productId})`)}`;

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded-full text-sm font-medium transition-colors"
      title={`Ask about ${productTitle} on WhatsApp`}
    >
      <MessageCircle size={14} />
      <span>Chat</span>
    </a>
  );
}

/**
 * Share Menu Component
 * Shows WhatsApp + other sharing options
 */
export function ShareMenu({
  productId,
  productTitle,
  productUrl,
  botPhone,
}: WhatsAppShareProps & {
  productUrl?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  const whatsappLink = `https://wa.me/${(botPhone || DEFAULT_BOT_PHONE)
    .replace(/\D/g, "")}?text=${encodeURIComponent(`Hi (ID:${productId})`)}`;

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: "💬",
      link: whatsappLink,
      description: "Chat with us",
    },
    {
      name: "Copy Link",
      icon: "🔗",
      action: () => {
        if (productUrl) {
          navigator.clipboard.writeText(productUrl);
          alert("Link copied!");
        }
      },
      description: "Copy product link",
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        <span>📤 Share</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          {shareOptions.map((option) => (
            <button
              key={option.name}
              onClick={() => {
                if (option.link) window.open(option.link, "_blank");
                if (option.action) option.action();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>{option.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{option.name}</p>
                  <p className="text-xs text-gray-600">{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
