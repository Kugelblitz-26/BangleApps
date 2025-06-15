// File: sleeplog.app.js
// Purpose: Display the collected sleep data (HR and Movement).

function drawGraph(data) {
  g.clear();
  Bangle.loadWidgets();
  Bangle.drawWidgets();

  if (!data || data.length < 2) {
    g.setFont("Vector", 20).setFontAlign(0, 0).drawString("No Sleep Data", g.getWidth()/2, g.getHeight()/2);
    g.setFont("6x8",1).drawString("Lock watch to start.", g.getWidth()/2, g.getHeight()/2 + 20);
    return;
  }

  // --- Chart Dimensions ---
  const chartX = 25;
  const chartY = 30;
  const chartW = g.getWidth() - chartX - 5;
  const chartH = g.getHeight() - chartY - 20;

  // --- Find Min/Max for scaling ---
  let minHR = 200, maxHR = 0, maxMove = 0;
  data.forEach(d => {
    if (d.hr < minHR) minHR = d.hr;
    if (d.hr > maxHR) maxHR = d.hr;
    if (d.movement > maxMove) maxMove = d.movement;
  });
  // Add a little padding to max values
  maxHR += 5;
  maxMove += 1;

  // --- Draw Axes and Labels ---
  g.setColor(g.theme.fg);
  g.setFont("6x8", 1);
  g.drawLine(chartX, chartY, chartX, chartY + chartH); // Y axis
  g.drawLine(chartX, chartY + chartH, chartX + chartW, chartY + chartH); // X axis
  
  // HR scale (left side)
  g.setFontAlign(-1, 0).drawString(maxHR.toFixed(0), 5, chartY);
  g.drawString(minHR.toFixed(0), 5, chartY + chartH);
  
  // --- Draw Legend ---
  g.setColor("#ff0000"); // Red for HR
  g.fillRect(10, g.getHeight()-10, 20, g.getHeight());
  g.setColor(g.theme.fg).drawString("HR", 25, g.getHeight()-5);
  
  g.setColor("#0000ff"); // Blue for Movement
  g.fillRect(60, g.getHeight()-10, 70, g.getHeight());
  g.setColor(g.theme.fg).drawString("Move", 75, g.getHeight()-5);

  // --- Plot the Data ---
  // Heart Rate (Red Line)
  g.setColor("#ff0000");
  g.moveTo(-10, -10); // Move offscreen to start
  for (let i = 0; i < data.length; i++) {
    let x = chartX + (i / (data.length - 1)) * chartW;
    let y = chartY + chartH - ((data[i].hr - minHR) / (maxHR - minHR)) * chartH;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }

  // Movement (Blue Bars)
  g.setColor("#0000ff");
  for (let i = 0; i < data.length; i++) {
    let x = chartX + (i / (data.length - 1)) * chartW;
    let y = chartY + chartH - Math.min(1, (data[i].movement / maxMove)) * chartH;
    g.fillRect(x, y, x + 1, chartY + chartH);
  }
}

// --- Main App Logic ---
const data = require("Storage").readJSON('sleeplog.json', true);
drawGraph(data);

// Exit app on button press or touch
setWatch(() => load(), BTN1, { edge: "falling" });
Bangle.on("touch", () => load());