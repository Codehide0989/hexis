export const PLAN_PRICES = { phantom: 41500, apex: 124500 }

interface RazorpayOptions {
  planId: 'phantom' | 'apex'
  userEmail: string
  userName: string
  onSuccess: (response: any) => void
  onFailure: (reason: string) => void
}

export function openRazorpayCheckout({ planId, userEmail, userName, onSuccess, onFailure }: RazorpayOptions) {
  if (!(window as any).Razorpay) {
    onFailure('Razorpay failed to load. Please disable adblockers or check your connection.')
    return
  }

  const key = import.meta.env.VITE_RAZORPAY_KEY_ID
  if (!key) {
    onFailure('Configuration error: Missing Razorpay key. Please restart your dev server.')
    return
  }

  const options = {
    key,
    amount: PLAN_PRICES[planId],
    currency: 'INR',
    name: 'HEXIS',
    description: `${planId.toUpperCase()} Plan — Monthly`,
    prefill: {
      name: userName,
      email: userEmail,
    },
    theme: {
      color: '#52b788'
    },
    handler: function(response: any) {
      onSuccess(response)
    }
  }

  try {
    const rzp = new (window as any).Razorpay(options)
    rzp.on('payment.failed', function(response: any) {
      onFailure(response.error?.description || 'Payment failed or cancelled')
    })
    rzp.open()
  } catch (error: any) {
    onFailure(error.message || 'Failed to initialize payment gateway')
  }
}
