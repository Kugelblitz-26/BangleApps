// sleeplog.app.js
(function() {
  // === Settings & Buffers ===
  var LOG_INTERVAL = 60000; // write every 60s
  var accelBuf = [], hrmBuf = [], pendingLog = [];
  var needsSave = false;

  // === Sensor Setup ===
  Bangle.setPollInterval(100); // accel at 100ms
  Bangle.setHRMPower(1);       // enable PPG HRM

  Bangle.on('accel', function(a) {
    var mag = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
    accelBuf.push(mag);
    if (accelBuf.length>100) accelBuf.shift();
  });
  Bangle.on('HRM', function(h) {
    hrmBuf.push(h.bpm);
    if (hrmBuf.length>50) hrmBuf.shift();
  });

  // === Simple Classifier ===
  function getHRV() {
    if (hrmBuf.length<2) return 0;
    var sum=0, mean, v=0;
    hrmBuf.forEach(function(b){ sum+=b; });
    mean=sum/hrmBuf.length;
    hrmBuf.forEach(function(b){ v+=Math.pow(b-mean,2); });
    return Math.sqrt(v/hrmBuf.length);
  }
  function classify() {
    var mag = accelBuf[accelBuf.length-1]||0, hrv=getHRV();
    var st = (mag<0.02&&hrv<2)?2:(mag<0.05?1:0);
    pendingLog.push({t:Date.now(),s:st});
    needsSave=true;
  }
  setInterval(classify, 100);

  // === Deferred Storage ===
  setInterval(function(){
    if (!needsSave) return;
    var S = require("Storage");
    var old = S.readJSON("sleepdata.json",1)||[];
    S.write("sleepdata.json", old.concat(pendingLog));
    pendingLog=[];
    needsSave=false;
  }, LOG_INTERVAL);

  // === Hypnogram Drawer ===
  function drawHypnogram() {
    var gW=g.getWidth(), gH=g.getHeight();
    g.clear().setFont("6x8",1).drawString("Sleep Log",gW/2-30,0);
    var log = require("Storage").readJSON("sleepdata.json",1)||[];
    if (log.length<5) return g.drawString("No data",gW/2-20,gH/2);
    // majority-smooth 5-sample windows
    var pts=[], w=5;
    for (var i=0;i<log.length;i+=w){
      var c=[0,0,0];
      log.slice(i,i+w).forEach(function(d){ c[d.s]++; });
      pts.push(c.indexOf(Math.max.apply(null,c)));
    }
    // plot
    var dx=gW/pts.length, base=10, ys=(gH-20)/2;
    g.setColor(0,1,0);
    pts.forEach(function(s,i){
      var x=i*dx, y=base+(2-s)*ys;
      g.fillCircle(x,y,2);
      if (i>0) g.drawLine(x-dx,base+(2-pts[i-1])*ys, x,y);
    });
    g.setColor(1,1,1)
     .drawString("Awake",0,gH-10)
     .drawString("Light",gW/3,gH-10)
     .drawString("Deep",2*gW/3,gH-10);
  }

  // === App & Menu ===
  function clearData() {
    require("Storage").erase("sleepdata.json");
    E.showMessage("Cleared");
    setTimeout(showMenu,1000);
  }
  function showMenu() {
    E.showMenu({
      "":{ "title":"SleepLog" },
      "View Sleep": drawHypnogram,
      "Clear Data": clearData,
      "< Exit": load
    });
  }
  showMenu();
})();
