export async function loadRazorpay() {
    if (window.Razorpay) return window.Razorpay;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = res; s.onerror = rej;
      document.body.appendChild(s);
    });
    return window.Razorpay;
  }
  