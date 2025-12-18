// lib/riskQuestions.js

// IMPORTANT:
// Open your risk-assessment.html file,
// copy the whole `const questions = [ ... ];` array
// and paste it inside RISK_QUESTIONS below, keeping
// the same structure: { text, name, options: [[label, value], ...] }

export const RISK_QUESTIONS = [
    { text: "Your present job or business is:", name: "q1", options: [["Less secure", 0], ["Relatively secure", 1], ["Secure", 3], ["Doesn’t matter as you can easily find a good new job / career", 3], ["Doesn’t matter as you already have enough wealth", 4]] },
    { text: "The number of years you have until retirement is:", name: "q2", options: [["Less than 5 years / Retired / Not applicable", 0], ["About 5 - 15 years", 2], ["About 15 - 25 years", 4], ["More than 25 years", 6]] },
    { text: "If your current source of income were to stop today, for how long will your present savings support you?", name: "q3", options: [["Less than 3 months", 0], ["3 - 6 months", 1], ["6 months to 1 year", 2], ["More than 1 year", 3]] },
    { text: "You have to financially support:", name: "q4", options: [["Only myself", 3], ["Two people including myself", 2], ["3 - 4 people other than myself", 1], ["More than 4 people other than myself", 0]] },
    { text: "Your current annual family savings percentage is (income less expenses) are:", name: "q5", options: [["0-20%", 1], ["20-30%", 2], ["30-40%", 3], ["Above 50%", 4]] },
    { text: "Which of these objectives is the most important to you from an investment perspective?", name: "q6", options: [["Preserving wealth", 1], ["Generating regular income to meet current requirements", 2], ["Balance current income and long-term growth", 3], ["Long-term growth", 4]] },
    { text: "Which of the following best describes your understanding of the investment market?", name: "q7", options: [["An experienced investor, constantly keeps up to date with the investment market.", 3], ["Awareness of the financial market is limited to information passed on by broker or financial planner.", 2], ["Little awareness of the investment market. However, want to build my knowledge and understanding", 1]] },
    { text: "Which is the riskiest option you have invested in?", name: "q8", options: [["Savings Account, Fixed Deposit", 0], ["Bonds or Debt Mutual Funds", 1], ["Equity Mutual Funds", 2], ["Real Estate Funds / Commodity linked Products", 3], ["Equity Shares / Structured Products", 4], ["Crypto / Private Equity / Venture Capital Funds", 5]] },
    { text: "Your preferred strategy for managing investment risk is:", name: "q9", options: [["Do not want to reduce it as investment risk leads to higher returns over the long-term.", 3], ["To have a diversified investment portfolio across a range of asset classes to minimise risk.", 2], ["To invest mainly in Principal stable investments.", 1]] },
    { text: "How would you react to a 20% loss in investment during a volatile market?", name: "q10", options: [["Sell all of my investments. (The preservation of capital is extremely important to me)", 1], ["Sell some of the investment. (I would transfer some funds into more secure investments)", 2], ["Do nothing with the investment. (This was a calculated risk, and I will leave the investments in place)", 3], ["Buy more. (I am a long-term investor and consider this sudden market correction as an opportunity)", 4]] },
    { text: "Willingness to experience short-term losses/volatility:", name: "q11", options: [["Very comfortable. I understand higher returns may come with risk or fluctuation in the short term", 3], ["Somewhat comfortable, assuming there is a limit to the volatility", 2], ["Little uncomfortable seeing my investments fluctuate", 1], ["Prefer minimal volatility investments", 0]] },
    { text: "How would you describe yourself as a risk-taker?", name: "q12", options: [["Willing to take risks for higher return", 3], ["Can take calculated risks", 2], ["Low risk taking capability", 1], ["Zero risk taking capability", 0]] }
  ];
  