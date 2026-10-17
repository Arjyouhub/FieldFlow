import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Download,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Sparkles,
  Smartphone,
  Globe,
} from 'lucide-react';

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  imageData,
  title = 'Field Staff Visit Matrix',
  recipientName = '',
  phone = '',
}) {
  const [copied, setCopied] = useState(true); // Automatically copied to clipboard on open

  if (!isOpen || !imageData) return null;

  const { blob, dataUrl, file } = imageData;

  // Clean phone number for WhatsApp links
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  // WhatsApp Web URL
  const whatsappWebUrl = targetPhone
    ? `https://web.whatsapp.com/send?phone=${targetPhone}`
    : `https://web.whatsapp.com`;

  // WhatsApp Desktop Windows Protocol
  const whatsappAppUrl = targetPhone
    ? `whatsapp://send?phone=${targetPhone}`
    : `whatsapp://send`;

  // Copy to clipboard
  const handleCopyClipboard = async () => {
    try {
      if (blob && window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  // Download image file directly
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = file?.name || `FieldFlow_Matrix_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Open Windows WhatsApp Desktop App
  const handleOpenDesktopApp = () => {
    window.location.href = whatsappAppUrl;
  };

  // Open WhatsApp Web
  const handleOpenWeb = () => {
    window.open(whatsappWebUrl, '_blank');
  };

  // Native share if supported
  const handleNativeShare = async () => {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: title,
          text: recipientName
            ? `FieldFlow Daily Visit Matrix - ${recipientName}`
            : 'FieldFlow Daily Visit Matrix',
        });
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('Native share failed:', e);
        }
      }
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 99999,
        background: 'rgba(2, 6, 23, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0F172A',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
              }}
            >
              <MessageCircle size={22} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#94A3B8',
                  marginTop: '2px',
                }}
              >
                {recipientName ? `Officer: ${recipientName}` : 'Daily Visit Update'}
                {targetPhone && ` • +${targetPhone}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '18px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Instructions Banner */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={18} color="#34D399" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ color: '#34D399', fontWeight: 700, fontSize: '13px' }}>
                  Image copied to clipboard!
                </span>
                <span style={{ color: '#94A3B8', fontSize: '12px', marginLeft: '8px' }}>
                  Press <strong style={{ color: '#FFFFFF' }}>Ctrl + V (Paste)</strong> in WhatsApp or any chat to send.
                </span>
              </div>
            </div>

            <button
              onClick={handleDownload}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
              }}
            >
              <Download size={15} /> Download Image (.PNG)
            </button>
          </div>

          {/* Image Preview Box */}
          <div
            style={{
              background: '#020617',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '12px',
              textAlign: 'center',
              maxHeight: '440px',
              overflow: 'auto',
            }}
          >
            <img
              src={dataUrl}
              alt="FieldFlow Matrix Preview"
              style={{
                width: '100%',
                maxHeight: '410px',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>

        {/* Action Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleCopyClipboard}
              style={{
                background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: copied ? '#34D399' : '#FFFFFF',
                border: copied ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.15)',
                padding: '9px 15px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied to Clipboard' : 'Copy Photo'}
            </button>

            <button
              onClick={handleDownload}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '9px 15px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Download size={16} /> Download Photo
            </button>

            {navigator.canShare && navigator.canShare({ files: [file] }) && (
              <button
                onClick={handleNativeShare}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60A5FA',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  padding: '9px 15px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Share2 size={16} /> Share via Phone/Device
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleOpenDesktopApp}
              title="Open WhatsApp Desktop App for Windows"
              style={{
                background: 'rgba(37, 211, 102, 0.15)',
                color: '#34D399',
                border: '1px solid rgba(37, 211, 102, 0.4)',
                padding: '9px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Smartphone size={16} /> WhatsApp App
            </button>

            <button
              onClick={handleOpenWeb}
              title="Open WhatsApp Web in Browser"
              style={{
                background: '#25D366',
                color: '#FFFFFF',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
              }}
            >
              <Globe size={15} /> WhatsApp Web <ExternalLink size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
