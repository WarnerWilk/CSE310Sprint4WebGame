/* The Long Fall
   Expanded top-down canvas game with Recon, Placement, Detonation, and Stealth.
*/
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  // Utility
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const dist = (ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);

  // Input
  let lastInput = { left: 0, right: 0, action: 0, escape: 0 };
  const input = {up:0,down:0,left:0,right:0,action:0,escape:0};
  window.addEventListener('keydown', e=>{
    if(e.key==='ArrowUp'||e.key==='w') input.up=1;
    if(e.key==='ArrowDown'||e.key==='s') input.down=1;
    if(e.key==='ArrowLeft'||e.key==='a') input.left=1;
    if(e.key==='ArrowRight'||e.key==='d') input.right=1;
    if(e.key==='e') input.action = 1;
    if(e.key==='Escape') input.escape = 1;
  });
  window.addEventListener('keyup', e=>{
    if(e.key==='ArrowUp'||e.key==='w') input.up=0;
    if(e.key==='ArrowDown'||e.key==='s') input.down=0;
    if(e.key==='ArrowLeft'||e.key==='a') input.left=0;
    if(e.key==='ArrowRight'||e.key==='d') input.right=0;
    if(e.key==='e') input.action = 0;
    if(e.key==='Escape') input.escape = 0;
  });

  // Level definition
  const levels = [
    { 
      width:1600, height:1000, name: "Ground",
      walls:[
        {x:0,y:0,w:1600,h:24}, {x:0,y:976,w:1600,h:24},
        {x:0,y:0,w:24,h:1000}, {x:1576,y:0,w:24,h:1000},
        {x:200,y:120,w:800,h:24}, {x:200,y:120,w:24,h:400},
        {x:1000,y:400,w:24,h:380}, {x:400,y:500,w:600,h:24},
        {x:1120,y:620,w:220,h:24}
      ],
      scanPoints:[
        {id:'g-1',x:300,y:220,r:30,material:'brick',progress:0,locked:false},
        {id:'g-2',x:700,y:140,r:30,material:'steel',progress:0,locked:false},
        {id:'g-3',x:1180,y:720,r:30,material:'masonry',progress:0,locked:false},
        {id:'g-4',x:920,y:540,r:30,material:'brick',progress:0,locked:false},
        {id:'g-5',x:520,y:780,r:30,material:'steel',progress:0,locked:false}
      ],
      placementSpots:[],
      stairs:[
        {x:1450,y:860,w:80,h:120,toFloor:1,label:'UP'}, 
        {x:1450,y:120,w:80,h:120,toFloor:2,label:'DOWN'} 
      ],
      exit:{x:60,y:860,w:80,h:120,active:true},
      watchers: [
        {type:'guard', x:400, y:300, pts:[{x:400,y:300},{x:800,y:300}], ptIdx:0, speed:90, dir:0, fov:Math.PI/2, range:350}
      ]
    },
    { 
      width:1600, height:1000, name: "Upper",
      walls:[
        {x:0,y:0,w:1600,h:24}, {x:0,y:976,w:1600,h:24},
        {x:0,y:0,w:24,h:1000}, {x:1576,y:0,w:24,h:1000},
        {x:300,y:160,w:900,h:24}, {x:300,y:160,w:24,h:320},
        {x:900,y:480,w:24,h:360}, {x:1160,y:240,w:220,h:24}
      ],
      scanPoints:[
        {id:'u-1',x:340,y:200,r:30,material:'masonry',progress:0,locked:false},
        {id:'u-2',x:940,y:440,r:30,material:'steel',progress:0,locked:false},
        {id:'u-3',x:1200,y:280,r:30,material:'masonry',progress:0,locked:false},
        {id:'u-4',x:400,y:800,r:30,material:'steel',progress:0,locked:false}
      ],
      placementSpots:[],
      stairs:[{x:1450,y:860,w:80,h:120,toFloor:0,label:'DOWN'}], 
      exit: null,
      watchers: [
        {type:'camera', x:330, y:190, dir:Math.PI/4, fov:Math.PI/2.5, range:450}
      ]
    },
    { 
      width:1600, height:1000, name: "Basement",
      walls:[
        {x:0,y:0,w:1600,h:24}, {x:0,y:976,w:1600,h:24},
        {x:0,y:0,w:24,h:1000}, {x:1576,y:0,w:24,h:1000},
        {x:220,y:160,w:700,h:24}, {x:220,y:160,w:24,h:260},
        {x:900,y:420,w:24,h:320}, {x:1050,y:620,w:320,h:24}
      ],
      scanPoints:[
        {id:'b-1',x:260,y:200,r:30,material:'concrete',progress:0,locked:false},
        {id:'b-2',x:940,y:380,r:30,material:'concrete',progress:0,locked:false},
        {id:'b-3',x:1100,y:660,r:30,material:'steel',progress:0,locked:false},
        {id:'b-4',x:500,y:800,r:30,material:'concrete',progress:0,locked:false}
      ],
      placementSpots:[],
      stairs:[{x:1450,y:120,w:80,h:120,toFloor:0,label:'UP'}], 
      exit: null,
      watchers: [
        {type:'guard', x:600, y:700, pts:[{x:600,y:700},{x:1000,y:700}], ptIdx:0, speed:80, dir:0, fov:Math.PI/2.2, range:350}
      ]
    }
  ];

  const deviceTypes = {
    acid: { type:'acid', name:'Acid', color:'#9f7aea', noiseRadius:100, placeTime:1.6, preferred:['brick','masonry','steel'] },
    explosive: { type:'explosive', name:'Explosive', color:'#ff6b6b', noiseRadius:250, placeTime:2.2, preferred:['steel','concrete'] },
    press: { type:'press', name:'Press', color:'#ffb703', noiseRadius:150, placeTime:1.8, preferred:['concrete','steel'] }
  };

  const SCAN_TIME = 2.0;

  // Stealth State
  let heat = 0;
  const MAX_HEAT = 100;
  let loadout = ['acid','explosive','press','acid', 'explosive'];
  let inventory = [];
  let holdPlacement = {spot:null, timer:0};
  let gameState = 'playing'; 
  let phaseState = 'recon'; 
  let exitInfoShown = false;
  
  // Phase 3 State
  let detonationState = { 
    active: false, started: false, nodes: [], edges: [], triggers: [], 
    selectedIndex: 0, floorStates: {}, triggerHistory: [], completed: false,
    score: null, totalDevicesStartedWith: 0
  };

  function getDeviceData(type){ return deviceTypes[type] || null; }
  
  function buildInventory(){
    inventory = loadout.filter(Boolean).slice(0,5);
    detonationState.totalDevicesStartedWith = inventory.length;
    player.carrying = inventory.shift() || null;
  }
  
  function getCurrentDevice(){ return player.carrying ? getDeviceData(player.carrying) : null; }
  
  function getPlacementCount(){ return levels.reduce((acc, l) => acc + (l.placementSpots||[]).filter(s=>s.placedDevice).length, 0); }
  function getTotalPlacementSlots(){ return levels.reduce((acc, l) => acc + (l.placementSpots||[]).length, 0); }
  function getScannedCount(){ return levels.reduce((acc, l) => acc + (l.scanPoints||[]).filter(s=>s.progress >= SCAN_TIME).length, 0); }
  function getTotalScanSlots(){ return levels.reduce((acc, l) => acc + (l.scanPoints||[]).length, 0); }

  // --- STEALTH & LOS MATH ---
  function lineIntersect(x1,y1,x2,y2, x3,y3,x4,y4) {
    const denom = (y4-y3)*(x2-x1) - (x4-x3)*(y2-y1);
    if (denom === 0) return null;
    const ua = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / denom;
    const ub = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / denom;
    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return { x: x1 + ua*(x2-x1), y: y1 + ua*(y2-y1), t: ua };
    }
    return null;
  }

  function getWallLines(walls) {
    const lines = [];
    for(const w of walls) {
      lines.push([w.x, w.y, w.x+w.w, w.y]);
      lines.push([w.x+w.w, w.y, w.x+w.w, w.y+w.h]);
      lines.push([w.x+w.w, w.y+w.h, w.x, w.y+w.h]);
      lines.push([w.x, w.y+w.h, w.x, w.y]);
    }
    return lines;
  }

  function isLineBlockedByWalls(x1,y1,x2,y2, walls) {
    const lines = getWallLines(walls);
    for(const l of lines) {
      if(lineIntersect(x1,y1,x2,y2, l[0],l[1],l[2],l[3])) return true;
    }
    return false;
  }

  function computeVisionPolygon(w, walls) {
    const poly = [{x: w.x, y: w.y}];
    const numRays = 30;
    const startAngle = w.dir - w.fov/2;
    const endAngle = w.dir + w.fov/2;
    const lines = getWallLines(walls);
    
    for(let i=0; i<=numRays; i++) {
      const angle = startAngle + (i/numRays) * w.fov;
      const rx = w.x + Math.cos(angle) * w.range;
      const ry = w.y + Math.sin(angle) * w.range;
      
      let minT = 1.0;
      let hit = {x: rx, y: ry};
      
      for(const l of lines) {
        const pt = lineIntersect(w.x, w.y, rx, ry, l[0],l[1],l[2],l[3]);
        if(pt && pt.t < minT) {
          minT = pt.t;
          hit = {x: pt.x, y: pt.y};
        }
      }
      poly.push(hit);
    }
    return poly;
  }


  // --- DETONATION PHASE LOGIC ---
  function buildDetonationGraph(){
    const nodes = [];
    const scaleX = 0.4; 
    const buildingX = W/2 - 320;
    const floorYMap = { 1: 0, 0: 1, 2: 2 }; 
    
    levels.forEach((lvl, floorIdx) => {
      const visualTier = floorYMap[floorIdx];
      let baseCap = 2.0; let baseLoad = 1.0;
      if (visualTier === 2) { baseCap = 4.0; baseLoad = 2.8; } 
      else if (visualTier === 1) { baseCap = 3.0; baseLoad = 1.8; } 
      
      const points = lvl.scanPoints || [];
      points.forEach(sp => {
        const placement = (lvl.placementSpots || []).find(p => p.id === sp.id && p.placedDevice);
        nodes.push({
          id: sp.id, floorIdx: floorIdx, visualTier: visualTier,
          cx: buildingX + (sp.x * scaleX), cy: 200 + (visualTier * 160), 
          capacity: baseCap + (['concrete','steel'].includes(sp.material) ? 0.8 : 0),
          originalCapacity: baseCap + (['concrete','steel'].includes(sp.material) ? 0.8 : 0),
          load: baseLoad, status: 'safe',
          device: placement ? placement.placedDevice : null,
          confidence: placement ? placement.confidence : 0,
          triggered: false, shake: 0
        });
      });
    });

    const edges = [];
    nodes.forEach(n1 => {
      nodes.forEach(n2 => {
        if (n1.id === n2.id) return;
        if (n1.floorIdx === n2.floorIdx && Math.abs(n1.cx - n2.cx) < 200) edges.push({a: n1.id, b: n2.id});
        if (Math.abs(n1.visualTier - n2.visualTier) === 1 && Math.abs(n1.cx - n2.cx) < 180) edges.push({a: n1.id, b: n2.id});
      });
    });

    const floorStates = {
      0: { tier: 0, yOff: 0, rot: 0, vy: 0, vr: 0, fallen: false },
      1: { tier: 1, yOff: 0, rot: 0, vy: 0, vr: 0, fallen: false },
      2: { tier: 2, yOff: 0, rot: 0, vy: 0, vr: 0, fallen: false }
    };
    const triggers = nodes.filter(n => n.device).map(n => n.id);

    return { nodes, edges, triggers, floorStates };
  }

  function startDetonationPrototype(){
    const graph = buildDetonationGraph();
    detonationState.nodes = graph.nodes; detonationState.edges = graph.edges;
    detonationState.triggers = graph.triggers; detonationState.floorStates = graph.floorStates;
    detonationState.selectedIndex = 0; detonationState.triggerHistory = [];
    detonationState.active = true; detonationState.started = true; detonationState.completed = false;
    phaseState = 'detonation'; heat = 0;
    showOverlay('Collapse sequence primed. Select device and press E to trigger.', 'info');
    setTimeout(()=>hideOverlay(), 2500);
  }

  function triggerDevice(nodeId) {
    const node = detonationState.nodes.find(n => n.id === nodeId);
    if (!node || node.triggered || node.status === 'failed') return;
    
    node.triggered = true;
    detonationState.triggerHistory.push(performance.now());
    
    const device = getDeviceData(node.device);
    const confBonus = node.confidence * 0.3;
    
    if(device.type === 'explosive'){
      node.load += 1.5 + confBonus; node.capacity = Math.max(0.1, node.capacity - 1.2);
    } else if(device.type === 'press'){
      node.load += 0.8 + confBonus; node.capacity = Math.max(0.1, node.capacity - 0.8);
    } else {
      node.load += 0.5 + confBonus; node.capacity = Math.max(0.1, node.capacity - 0.5);
    }
  }

  function calculateSuspicion() {
    const totalPlaced = detonationState.triggers.length;
    if (totalPlaced === 0) return { score: 100, verdict: 'NO COLLAPSE: JOB FAILED' };
    
    let timeDiffSum = 0;
    for(let i=1; i<detonationState.triggerHistory.length; i++){
      timeDiffSum += (detonationState.triggerHistory[i] - detonationState.triggerHistory[i-1]) / 1000;
    }
    const avgDelay = detonationState.triggerHistory.length > 1 ? timeDiffSum / (detonationState.triggerHistory.length - 1) : 0;
    const deviceFactor = (totalPlaced / Math.max(1, detonationState.totalDevicesStartedWith)) * 40;
    const timeFactor = Math.max(0, 60 - (avgDelay * 15));
    
    let score = clamp(Math.round(deviceFactor + timeFactor), 0, 100);
    let verdict = score > 75 ? "ARSON SUSPECTED: SYNCHRONIZED DEMOLITION DISCOVERED" : 
                  score > 40 ? "INVESTIGATION OPENED: ANOMALOUS STRUCTURAL FAILURE" : 
                  "TRAGIC ACCIDENT: ROUTINE STRUCTURAL COLLAPSE";
    return { score, verdict };
  }

  function tickDetonationPhysics(dt){
    if(!detonationState.active) return;
    let anyActive = false; let anyFailedThisFrame = false;

    detonationState.nodes.forEach(n => {
      if (n.status === 'failed') return;
      anyActive = true;
      const stress = n.load / Math.max(0.1, n.capacity);
      if (stress >= 1.0) {
        n.status = 'failed'; anyFailedThisFrame = true;
        const neighbors = detonationState.edges.filter(e => e.a === n.id || e.b === n.id).map(e => e.a === n.id ? e.b : e.a);
        const intactNeighbors = detonationState.nodes.filter(on => neighbors.includes(on.id) && on.status !== 'failed');
        if (intactNeighbors.length > 0) {
          const loadShare = n.load / intactNeighbors.length;
          intactNeighbors.forEach(inb => inb.load += loadShare);
        }
      } else if (stress > 0.8) {
        n.shake = (Math.random() - 0.5) * 4 * (stress - 0.7);
        n.status = stress > 0.95 ? 'critical' : 'warn';
      } else { n.shake = 0; n.status = 'safe'; }
    });

    [0, 1, 2].forEach(tier => {
      const fs = detonationState.floorStates[tier];
      const floorNodes = detonationState.nodes.filter(n => n.visualTier === tier);
      const originalCap = floorNodes.reduce((sum, n) => sum + n.originalCapacity, 0);
      const currentCap = floorNodes.filter(n => n.status !== 'failed').reduce((sum, n) => sum + n.capacity, 0);
      
      if (currentCap < originalCap * 0.4) {
        fs.fallen = true; fs.vy += 400 * dt; fs.vr += (Math.random() - 0.5) * 2 * dt;
        fs.yOff += fs.vy * dt; fs.rot += fs.vr * dt;
      }
    });

    if (!anyFailedThisFrame && detonationState.triggers.length > 0) {
      const allTriggered = detonationState.nodes.filter(n => n.device).every(n => n.triggered);
      if (allTriggered && !detonationState.completed) {
        detonationState.completed = true;
        setTimeout(() => { detonationState.score = calculateSuspicion(); gameState = 'finished'; }, 2000);
      }
    }
  }

  // --- RECON/PLACEMENT PLAYER LOGIC ---
  const player = { x:120, y:200, r:14, speed:240, floor:0, carrying:null };
  let last = performance.now();
  
  function resetLevel() {
    levels.forEach(lev=>{
      if(lev.placementSpots) lev.placementSpots = []; 
      if(lev.scanPoints) lev.scanPoints.forEach(s=>{ s.progress = 0; s.locked = false; });
      if(lev.watchers) lev.watchers.forEach(w => {
         if(w.type === 'guard' && w.pts) {
             w.ptIdx = 0; w.x = w.pts[0].x; w.y = w.pts[0].y;
         }
      });
    });
    player.floor = 0; player.carrying=null;
    phaseState = 'recon'; heat = 0; gameState = 'playing';
    
    const startExit = levels[0].exit;
    if(startExit){
      player.x = startExit.x + startExit.w + player.r + 8;
      player.y = startExit.y + startExit.h/2;
    } else {
      player.x = 120; player.y = 200;
    }
    levels[0].exit.active=true;
    holdPlacement = {spot:null, timer:0};
    buildInventory();
    hideOverlay();
  }

  function advanceToPlacement() {
    levels.forEach((lvl) => {
      lvl.placementSpots = (lvl.scanPoints || [])
        .filter(s => s.progress > 0)
        .map(s => ({
          id: s.id, x: s.x, y: s.y, r: s.r, material: s.material,
          confidence: s.progress / SCAN_TIME, scanned: true, placedDevice: null
        }));
    });
    phaseState = 'placement';
    const startExit = levels[0].exit;
    player.x = startExit.x + startExit.w + player.r + 8; player.y = startExit.y + startExit.h/2;
    showOverlay('Recon complete. Returning at night to place devices.', 'info');
    setTimeout(()=>hideOverlay(), 2500);
  }

  function updateScoreHud(){
    const current = getCurrentDevice();
    const hudScans = document.getElementById('scans'); const hudCarry = document.getElementById('carry');
    const hudDevices = document.getElementById('devices'); const hudPlacements = document.getElementById('placements');
    
    if(phaseState === 'recon') {
      document.getElementById('phaseVal').textContent = 'Recon';
      document.getElementById('scansVal').textContent = `${getScannedCount()}/${getTotalScanSlots()}`;
      hudScans.classList.remove('hidden'); hudCarry.classList.add('hidden');
      hudDevices.classList.add('hidden'); hudPlacements.classList.add('hidden');
    } else if (phaseState === 'placement') {
      document.getElementById('phaseVal').textContent = 'Placement';
      document.getElementById('carryVal').textContent = current ? current.name : 'None';
      document.getElementById('devicesVal').textContent = inventory.length;
      document.getElementById('placementsVal').textContent = `${getPlacementCount()}/${getTotalPlacementSlots()}`;
      hudScans.classList.add('hidden'); hudCarry.classList.remove('hidden');
      hudDevices.classList.remove('hidden'); hudPlacements.classList.remove('hidden');
    } else {
      document.getElementById('phaseVal').textContent = 'Detonation';
      hudScans.classList.add('hidden'); hudCarry.classList.add('hidden');
      hudDevices.classList.add('hidden'); hudPlacements.classList.add('hidden');
    }
  }

  function circleRectCollision(cx,cy,r,rect){
    const rx = clamp(cx, rect.x, rect.x+rect.w); const ry = clamp(cy, rect.y, rect.y+rect.h);
    return dist(cx,cy,rx,ry) <= r;
  }

  function update(dt){
    if (gameState === 'finished') return;
    
    if (gameState === 'caught') {
      if(input.action && !lastInput.action) resetLevel();
      lastInput.action = input.action; lastInput.left = input.left; lastInput.right = input.right; lastInput.escape = input.escape;
      return;
    }

    if(phaseState === 'detonation'){
      if(!detonationState.started){
        if(input.action && !lastInput.action) startDetonationPrototype();
      } else {
        tickDetonationPhysics(dt);
        if (detonationState.triggers.length > 0 && !detonationState.completed) {
          if (input.right && !lastInput.right) detonationState.selectedIndex = (detonationState.selectedIndex + 1) % detonationState.triggers.length;
          if (input.left && !lastInput.left) detonationState.selectedIndex = (detonationState.selectedIndex - 1 + detonationState.triggers.length) % detonationState.triggers.length;
          if (input.action && !lastInput.action) triggerDevice(detonationState.triggers[detonationState.selectedIndex]);
        }
      }
      lastInput.action = input.action; lastInput.left = input.left; lastInput.right = input.right; lastInput.escape = input.escape;
      updateScoreHud();
      return;
    }

    // Player movement
    let vx = (input.right - input.left); let vy = (input.down - input.up);
    let moving = false;
    if(vx!==0 || vy!==0){
      moving = true;
      const len = Math.hypot(vx,vy);
      vx /= len||1; vy /= len||1;
      player.x += vx * player.speed * dt; player.y += vy * player.speed * dt;
    }

    const floor = levels[player.floor];
    for(const w of floor.walls){
      if(circleRectCollision(player.x,player.y,player.r,w)){
        if(vx||vy){ player.x -= vx * player.speed * dt; player.y -= vy * player.speed * dt; }
      }
    }

    // Stairs
    for(const s of floor.stairs){
      if(player.x > s.x && player.x < s.x + s.w && player.y > s.y && player.y < s.y + s.h){
        const dest = s.toFloor; player.floor = dest;
        const destStairs = levels[dest].stairs && levels[dest].stairs[0];
        if(destStairs){
          const leftX = destStairs.x - player.r - 8; const rightX = destStairs.x + destStairs.w + player.r + 8;
          if(leftX > 24) player.x = leftX; else player.x = rightX;
          player.y = destStairs.y + destStairs.h/2;
        }
      }
    }
    
    // Interactions
    if(phaseState === 'recon') {
      for(const spot of floor.scanPoints || []){
        if (!spot.locked && dist(player.x,player.y,spot.x,spot.y) <= spot.r + player.r) spot.progress = clamp(spot.progress + dt, 0, SCAN_TIME);
      }
    } else if (phaseState === 'placement') {
      const current = getCurrentDevice();
      let targetSpot = null;
      for(const spot of floor.placementSpots || []){
        if(!spot.placedDevice && dist(player.x,player.y,spot.x,spot.y) <= spot.r + player.r){ targetSpot = spot; break; }
      }
      if(current && targetSpot && input.action){
        if(holdPlacement.spot !== targetSpot) holdPlacement = {spot: targetSpot, timer: 0};
        holdPlacement.timer += dt;
        if(holdPlacement.timer >= current.placeTime){
          targetSpot.placedDevice = current.type; player.carrying = null; holdPlacement = {spot:null, timer:0};
        }
      } else {
        if(targetSpot !== holdPlacement.spot) holdPlacement.timer = 0;
      }
    }

    // Stealth & Vision Math
    let isSeen = false;
    let isHeard = false;
    if(floor.watchers) {
      for(const w of floor.watchers) {
        // Guard Movement
        if(w.type === 'guard') {
          const target = w.pts[w.ptIdx];
          const dx = target.x - w.x; const dy = target.y - w.y;
          const distToTarget = Math.hypot(dx,dy);
          if(distToTarget < 5) {
            w.ptIdx = (w.ptIdx + 1) % w.pts.length;
          } else {
            w.x += (dx/distToTarget) * w.speed * dt;
            w.y += (dy/distToTarget) * w.speed * dt;
            w.dir = Math.atan2(dy, dx);
          }
        }
        
        // Vision Check
        const distToPlayer = dist(w.x, w.y, player.x, player.y);
        if(distToPlayer <= w.range) {
          const angleToPlayer = Math.atan2(player.y - w.y, player.x - w.x);
          let angleDiff = angleToPlayer - w.dir;
          while(angleDiff <= -Math.PI) angleDiff += Math.PI*2;
          while(angleDiff > Math.PI) angleDiff -= Math.PI*2;
          
          if(Math.abs(angleDiff) <= w.fov/2) {
            if(!isLineBlockedByWalls(w.x, w.y, player.x, player.y, floor.walls)) {
              isSeen = true;
            }
          }
        }
        
        // Noise check during placement
        if(phaseState === 'placement' && moving) {
           const current = getCurrentDevice();
           if(current && distToPlayer <= current.noiseRadius) isHeard = true;
        }
      }
    }
    
    if(isSeen) heat += 40 * dt;
    else if(isHeard) heat += 15 * dt;
    else heat = Math.max(0, heat - 15 * dt);
    
    if(heat >= MAX_HEAT) {
      gameState = 'caught';
      showOverlay('You were spotted! Press E to restart level.', 'lose');
    }

    // Exit & Escaping logic
    const ex = floor.exit;
    const atExit = ex && ex.active && player.x > ex.x && player.x < ex.x + ex.w && player.y > ex.y && player.y < ex.y + ex.h;
    if(atExit && !exitInfoShown){
      if(phaseState === 'recon') showOverlay(`Exit point. Use ESC or E to finish recon.`, 'info');
      else {
        if(!player.carrying && inventory.length > 0){ player.carrying = inventory.shift(); showOverlay(`Restocked.`, 'info'); } 
        else showOverlay(`Exit point. Devices available: ${inventory.length}`, 'info');
      }
      exitInfoShown = true;
      setTimeout(hideOverlay, 3200);
    }
    if(!atExit) exitInfoShown = false;

    if((input.escape && !lastInput.escape) || (atExit && input.action && !lastInput.action)){
      if(phaseState === 'recon') advanceToPlacement();
      else if (phaseState === 'placement') {
        phaseState = 'detonation'; detonationState.started = false;
        showOverlay('Placement complete! Press E to begin Detonation Phase.', 'win');
      }
    }
    
    lastInput.action = input.action; lastInput.left = input.left; lastInput.right = input.right; lastInput.escape = input.escape;
    updateScoreHud();
  }

  function showOverlay(text, cls){
    const o = document.getElementById('overlay');
    o.innerHTML = text; o.className = '';
    if(cls) o.classList.add(cls);
    o.classList.remove('hidden');
  }
  function hideOverlay(){ document.getElementById('overlay').classList.add('hidden'); }

  function draw(){
    ctx.clearRect(0,0,W,H);
    if(phaseState === 'detonation'){ drawDetonationPhase(); return; }
    
    const lev = levels[player.floor];
    const camx = clamp(player.x - W/2, 0, Math.max(0, lev.width - W));
    const camy = clamp(player.y - H/2, 0, Math.max(0, lev.height - H));
    ctx.fillStyle = '#061029'; ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.translate(-camx, -camy);

    // Watcher vision cones
    if(lev.watchers) {
      for(const w of lev.watchers) {
        const poly = computeVisionPolygon(w, lev.walls);
        ctx.fillStyle = 'rgba(255, 60, 60, 0.15)';
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for(let i=1; i<poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = w.type === 'guard' ? '#ff3333' : '#aa3333';
        ctx.beginPath(); ctx.arc(w.x, w.y, 10, 0, Math.PI*2); ctx.fill();
      }
    }

    // Walls
    ctx.fillStyle = '#223';
    for(const w of lev.walls) ctx.fillRect(w.x, w.y, w.w, w.h);

    // Spots
    if (phaseState === 'recon') {
      for(const spot of lev.scanPoints || []){
        ctx.beginPath(); ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI*2);
        ctx.fillStyle = spot.progress >= SCAN_TIME ? 'rgba(90,200,240,0.2)' : 'rgba(90,200,240,0.05)';
        ctx.fill();
        ctx.strokeStyle = spot.progress >= SCAN_TIME ? '#5ac8f0' : '#4a8ba8'; 
        ctx.lineWidth = 2; ctx.stroke();
        
        ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(spot.material, spot.x, spot.y - spot.r - 6);
        
        if(spot.progress > 0 && spot.progress < SCAN_TIME){
          const progress = spot.progress/SCAN_TIME;
          ctx.beginPath(); ctx.arc(spot.x, spot.y, spot.r + 8, -Math.PI/2, -Math.PI/2 + Math.PI*2*progress);
          ctx.strokeStyle = '#5ac8f0'; ctx.lineWidth = 4; ctx.stroke();
        }
      }
    } else if (phaseState === 'placement') {
      for(const spot of lev.placementSpots || []){
        ctx.beginPath(); ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI*2);
        ctx.fillStyle = spot.placedDevice ? 'rgba(90,200,140,0.28)' : 'rgba(210,185,95,0.14)';
        ctx.fill();
        ctx.strokeStyle = spot.placedDevice ? '#78c084' : '#f0d575'; ctx.lineWidth = 2; ctx.stroke();
        
        if(spot.placedDevice){
          ctx.fillStyle = getDeviceData(spot.placedDevice).color;
          ctx.beginPath(); ctx.arc(spot.x, spot.y, 10, 0, Math.PI*2); ctx.fill();
        }
        if(holdPlacement.spot === spot){
          const current = getCurrentDevice();
          if(current){
            const progress = clamp(holdPlacement.timer/current.placeTime,0,1);
            ctx.beginPath(); ctx.arc(spot.x, spot.y, spot.r + 8, -Math.PI/2, -Math.PI/2 + Math.PI*2*progress);
            ctx.strokeStyle = '#ffdc7a'; ctx.lineWidth = 4; ctx.stroke();
          }
        }
      }
      
      // Noise radius preview
      const currentDev = getCurrentDevice();
      if(currentDev && (input.left||input.right||input.up||input.down)) {
         ctx.beginPath(); ctx.arc(player.x, player.y, currentDev.noiseRadius, 0, Math.PI*2);
         ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }

    // Exit
    if(lev.exit){
      ctx.fillStyle = lev.exit.active ? 'rgba(255,200,90,0.45)' : 'rgba(80,80,80,0.35)';
      ctx.fillRect(lev.exit.x, lev.exit.y, lev.exit.w, lev.exit.h);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(lev.exit.x, lev.exit.y, lev.exit.w, lev.exit.h);
      ctx.fillStyle = '#111'; ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', lev.exit.x + lev.exit.w/2, lev.exit.y + lev.exit.h/2);
    }

    // Stairs
    for(const s of lev.stairs){
      ctx.fillStyle = 'rgba(180,180,220,0.12)'; ctx.fillRect(s.x,s.y,s.w,s.h);
      ctx.strokeStyle = '#cfc'; ctx.strokeRect(s.x,s.y,s.w,s.h);
      ctx.fillStyle = '#fff'; ctx.font='14px sans-serif'; 
      ctx.fillText(s.label || 'STAIRS', s.x + s.w/2, s.y + s.h/2);
    }

    // Player
    ctx.fillStyle='#9ad3bc'; ctx.beginPath(); ctx.arc(player.x,player.y,player.r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#083'; ctx.lineWidth=2; ctx.stroke();
    ctx.restore();
    
    // Draw Heat UI
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W/2 - 100, 10, 200, 20);
    ctx.fillStyle = heat > 70 ? '#ff4444' : '#ffaa00';
    ctx.fillRect(W/2 - 100, 10, (heat/MAX_HEAT)*200, 20);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(W/2 - 100, 10, 200, 20);
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('HEAT', W/2, 34);
  }

  function drawDetonationPhase(){
    ctx.fillStyle = '#040816'; ctx.fillRect(0,0,W,H);
    
    if (gameState === 'finished' && detonationState.score) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = 'bold 36px serif'; ctx.fillText(detonationState.score.verdict, W/2, H/2 - 40);
      ctx.font = '24px sans-serif';
      ctx.fillStyle = detonationState.score.score > 50 ? '#ff6b6b' : '#45b36b';
      ctx.fillText(`Suspicion Score: ${detonationState.score.score}/100`, W/2, H/2 + 20);
      return;
    }

    ctx.fillStyle = '#d8e6ff'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Detonation Phase', W/2, 36);

    if(!detonationState.started) { ctx.fillText('Press E to begin collapse sequence.', W/2, H/2); return; }

    const buildingW = 640; const buildingX = W/2 - buildingW/2; const floorH = 160;

    [0, 1, 2].forEach(tier => {
      const fs = detonationState.floorStates[tier];
      const cx = buildingX + buildingW/2; const cy = 120 + (tier * floorH) + floorH/2;
      
      ctx.save(); ctx.translate(cx, cy + fs.yOff); ctx.rotate(fs.rot);
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(-buildingW/2, -floorH/2, buildingW, floorH); ctx.strokeRect(-buildingW/2, -floorH/2, buildingW, floorH);
      
      detonationState.nodes.filter(n => n.visualTier === tier).forEach(node => {
        if (node.status === 'failed') return; 
        const ratio = clamp(node.load / Math.max(0.1, node.capacity), 0, 1);
        const hue = (1 - ratio) * 120; 
        ctx.fillStyle = `hsl(${hue}, 80%, 50%)`; ctx.strokeStyle = '#fff';
        
        const nx = (node.cx - cx) + node.shake; const ny = (node.cy - cy) - floorH/2 + 20; 
        const nw = 24; const nh = floorH - 40;
        
        ctx.fillRect(nx - nw/2, ny, nw, nh); ctx.strokeRect(nx - nw/2, ny, nw, nh);
        
        if (node.device && !node.triggered) {
          ctx.fillStyle = getDeviceData(node.device).color;
          ctx.beginPath(); ctx.arc(nx, ny + nh/2, 8, 0, Math.PI*2); ctx.fill();
        }
        
        if (ratio > 0.9) {
          ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(nx - 5, ny + 10); ctx.lineTo(nx + 8, ny + 30);
          ctx.lineTo(nx - 6, ny + 60); ctx.lineTo(nx + 4, ny + nh - 10); ctx.stroke(); ctx.lineWidth = 1;
        }
      });
      ctx.restore();
    });

    if (detonationState.triggers.length > 0 && !detonationState.completed) {
      const activeTargetId = detonationState.triggers[detonationState.selectedIndex];
      const targetNode = detonationState.nodes.find(n => n.id === activeTargetId);
      
      if (targetNode && !targetNode.triggered && targetNode.status !== 'failed') {
        const fs = detonationState.floorStates[targetNode.visualTier];
        const screenX = targetNode.cx; const screenY = targetNode.cy + fs.yOff;
        
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        const pulse = 16 + Math.sin(performance.now() / 150) * 4;
        ctx.beginPath(); ctx.arc(screenX, screenY, pulse, 0, Math.PI*2); ctx.stroke(); ctx.lineWidth = 1;
        
        ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
        ctx.fillText(`Target: ${getDeviceData(targetNode.device).name}`, W/2, H - 40);
        ctx.fillText(`[< Left]  [Right >]   [E] Detonate`, W/2, H - 20);
      } else {
        ctx.fillStyle = '#aaa'; ctx.font = '14px sans-serif';
        ctx.fillText(`Device detonated or lost in collapse.`, W/2, H - 40);
        ctx.fillText(`[< Left]  [Right >]`, W/2, H - 20);
      }
    }
  }

  function loop(now){
    const dt = Math.min(0.05, (now - last)/1000);
    last = now; update(dt); draw(); requestAnimationFrame(loop);
  }

  resetLevel();
  requestAnimationFrame(loop);
})();