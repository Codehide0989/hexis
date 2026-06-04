const FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL || 'billing@mail.adda67.app'

export interface InvoiceEmailData {
  to: string
  clientName: string
  invoiceNumber: string
  total: number
  currency: string
  dueDate: string
  items: Array<{
    description: string
    quantity: number
    price: number
    total: number
  }>
  notes?: string
}

export const sendInvoiceEmail = async (
  data: InvoiceEmailData
): Promise<{ success: boolean; error?: string }> => {
  
  const sym = data.currency === 'INR' ? '₹' : '$'
  
  const itemsHtml = data.items.map(item => `
    <tr style="border-bottom:1px solid #1b4332">
      <td style="padding:10px;color:#d8f3dc;font-family:monospace">${item.description}</td>
      <td style="padding:10px;color:#d8f3dc;font-family:monospace;text-align:center">${item.quantity}</td>
      <td style="padding:10px;color:#d8f3dc;font-family:monospace;text-align:right">${sym}${item.price.toFixed(2)}</td>
      <td style="padding:10px;color:#52b788;font-family:monospace;text-align:right">${sym}${item.total.toFixed(2)}</td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="margin:0;padding:0;background:#0a1a0f;font-family:monospace">
      <div style="max-width:600px;margin:40px auto;background:#0d2818;border:1px solid #1b4332;padding:40px">
        
        <div style="margin-bottom:32px">
          <h1 style="color:#52b788;font-size:24px;letter-spacing:4px;margin:0">HEXIS</h1>
          <p style="color:#95d5b2;font-size:11px;letter-spacing:2px;margin:4px 0 0">INVOICE SYSTEM</p>
        </div>
        
        <div style="border-bottom:1px solid #1b4332;padding-bottom:24px;margin-bottom:24px">
          <h2 style="color:#d8f3dc;font-size:18px;letter-spacing:2px">INVOICE ${data.invoiceNumber}</h2>
          <p style="color:#95d5b2;font-size:12px;margin:8px 0">TO: ${data.clientName}</p>
          <p style="color:#95d5b2;font-size:12px">DUE: ${data.dueDate}</p>
        </div>
        
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead>
            <tr style="background:#0a1a0f">
              <th style="padding:10px;color:#52b788;font-size:11px;text-align:left;letter-spacing:2px">DESCRIPTION</th>
              <th style="padding:10px;color:#52b788;font-size:11px;text-align:center;letter-spacing:2px">QTY</th>
              <th style="padding:10px;color:#52b788;font-size:11px;text-align:right;letter-spacing:2px">PRICE</th>
              <th style="padding:10px;color:#52b788;font-size:11px;text-align:right;letter-spacing:2px">TOTAL</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        
        <div style="text-align:right;border-top:1px solid #1b4332;padding-top:16px">
          <p style="color:#d8f3dc;font-size:18px;font-weight:bold">TOTAL: ${sym}${data.total.toFixed(2)}</p>
        </div>
        
        ${data.notes ? `
        <div style="margin-top:24px;padding:16px;background:#0a1a0f;border:1px solid #1b4332">
          <p style="color:#95d5b2;font-size:11px;letter-spacing:2px;margin:0 0 8px">NOTES</p>
          <p style="color:#d8f3dc;font-size:13px;margin:0">${data.notes}</p>
        </div>` : ''}
        
        <div style="margin-top:32px;text-align:center">
          <p style="color:#2d6a4f;font-size:10px;letter-spacing:2px">SENT VIA HEXIS · WORK IN THE SHADOWS</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const resendUrl = '/api/resend/emails';
      
    const response = await fetch(resendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [data.to],
        subject: `INVOICE ${data.invoiceNumber} — ${sym}${data.total.toFixed(2)}`,
        html,
      }),
    })
    
    if (!response.ok) {
      const errText = await response.text();
      let errMsg = 'Email send failed';
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.message || errMsg;
      } catch {
        errMsg = errText || errMsg;
      }
      return { success: false, error: errMsg };
    }
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export const sendReminderEmail = async (
  title: string,
  timeStr: string,
  toEmail: string
): Promise<{ success: boolean; error?: string }> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a1a0f;font-family:monospace">
      <div style="max-width:600px;margin:40px auto;background:#0d2818;border:1px solid #1b4332;padding:40px">
        <h1 style="color:#52b788;font-size:24px;letter-spacing:4px;margin:0">HEXIS SYSTEM</h1>
        <p style="color:#95d5b2;font-size:11px;letter-spacing:2px;margin:4px 0 32px">AUTOMATED REMINDER</p>
        
        <div style="border-left:2px solid #52b788;padding-left:16px;margin-bottom:32px">
          <p style="color:#d8f3dc;font-size:18px;margin:0 0 8px">${title}</p>
          <p style="color:#95d5b2;font-size:12px;margin:0">SCHEDULED FOR: ${timeStr}</p>
        </div>
        
        <div style="margin-top:32px;text-align:center">
          <p style="color:#2d6a4f;font-size:10px;letter-spacing:2px">SENT VIA HEXIS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const resendUrl = '/api/resend/emails';
    const response = await fetch(resendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: `REMINDER: ${title}`,
        html,
      }),
    });
    
    if (!response.ok) {
      return { success: false, error: 'Email send failed' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
