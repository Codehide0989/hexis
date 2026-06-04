const FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL || 'billing@yourdomain.com'

export interface UpgradeEmailData {
  to: string
  userName: string
  plan: 'phantom' | 'apex'
  paymentId: string
  features: string[]
}

export const sendUpgradeEmail = async (
  data: UpgradeEmailData
): Promise<{ success: boolean; error?: string }> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="margin:0;padding:0;background-color:#0a1a0f;font-family:'Courier New', Courier, monospace">
      <div style="max-width:600px;margin:40px auto;background-color:#050f08;border:1px solid #1b4332;padding:40px;position:relative;">
        
        <!-- Top decorative bar -->
        <div style="position:absolute;top:0;left:0;right:0;height:4px;background-color:#52b788;"></div>
        
        <div style="margin-bottom:40px;border-bottom:1px dashed #1b4332;padding-bottom:20px;">
          <h1 style="color:#52b788;font-size:28px;letter-spacing:6px;margin:0;font-weight:bold;">HEXIS</h1>
          <p style="color:#2d6a4f;font-size:10px;letter-spacing:4px;margin:8px 0 0;">ENCRYPTED COMMUNIQUÉ // SECURE CHANNEL</p>
        </div>
        
        <div style="background-color:#0a1a0f;border:1px solid #1b4332;padding:20px;margin-bottom:30px;">
          <h2 style="color:#d8f3dc;font-size:16px;letter-spacing:2px;margin:0 0 16px 0;">> CLEARANCE UPGRADED: ${data.plan.toUpperCase()}</h2>
          <table style="width:100%;font-size:12px;color:#95d5b2;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;width:120px;color:#40916c;">OPERATIVE:</td>
              <td style="padding:4px 0;color:#d8f3dc;">${data.userName}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#40916c;">PAYMENT REF:</td>
              <td style="padding:4px 0;color:#d8f3dc;">${data.paymentId}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#40916c;">TIMESTAMP:</td>
              <td style="padding:4px 0;color:#d8f3dc;">${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</td>
            </tr>
          </table>
        </div>
        
        <p style="color:#95d5b2;font-size:13px;line-height:1.6;margin:0 0 20px 0;">
          Your workspace resource allocation has been successfully modified. The following classified features are now active in your environment:
        </p>
        
        <div style="margin-bottom:30px;">
          ${data.features.map(f => `
            <div style="display:table;width:100%;margin-bottom:8px;">
              <div style="display:table-cell;width:20px;color:#52b788;">[+]</div>
              <div style="display:table-cell;color:#d8f3dc;font-size:12px;letter-spacing:1px;">${f}</div>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top:30px;padding:20px;border-left:3px solid #52b788;background-color:#0a1a0f;">
          <p style="color:#40916c;font-size:11px;letter-spacing:2px;margin:0 0 8px;">DIRECTIVE</p>
          <p style="color:#95d5b2;font-size:12px;line-height:1.5;margin:0;">
            Restart your terminal sessions if changes do not appear immediately. For encrypted support, reply directly to this transmission.
          </p>
        </div>
        
        <div style="margin-top:40px;text-align:center;border-top:1px dashed #1b4332;padding-top:20px;">
          <p style="color:#1b4332;font-size:10px;letter-spacing:3px;margin:0;">END OF TRANSMISSION // WORK IN THE SHADOWS</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const apiUrl = import.meta.env.DEV
      ? '/api/resend/emails'
      : '/api/resend/emails';
      
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [data.to],
        subject: `✓ HEXIS — ${data.plan.toUpperCase()} Plan Activated`,
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
