/* Recon prototype: Phase 2
   Expanded top-down canvas game with multiple floors, scan points, patrols, cameras, heat meter, and exit scoring.
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

  // Level definition: three floors
  const levels = [
    { // floor 0: ground floor
      width:1600, height:1000,
      walls:[
        {x:0,y:0,w:1600,h:24},
        {x:0,y:976,w:1600,h:24},
        {x:0,y:0,w:24,h:1000},
        {x:1576,y:0,w:24,h:1000},
        {x:200,y:120,w:800,h:24},
        {x:200,y:120,w:24,h:400},
        {x:1000,y:400,w:24,h:380},
        {x:400,y:500,w:600,h:24},
        {x:1120,y:620,w:220,h:24}
      ],
      scanPoints:[],
      placementSpots:[
        {id:'spot-1',x:300,y:220,r:30,material:'brick',confidence:0.88,scanned:true,placedDevice:null},
        {id:'spot-2',x:700,y:140,r:30,material:'steel',confidence:0.75,scanned:true,placedDevice:null},
        {id:'spot-3',x:1180,y:720,r:30,material:'concrete',confidence:0.92,scanned:true,placedDevice:null},
        {id:'spot-4',x:920,y:540,r:30,material:'masonry',confidence:0.68,scanned:true,placedDevice:null},
        {id:'spot-5',x:520,y:780,r:30,material:'concrete',confidence:0.55,scanned:true,placedDevice:null}
      ],
      stairs:[{x:1450,y:860,w:80,h:120,toFloor:1}],
      exit:{x:60,y:860,w:80,h:120,active:true}
    },
    { // floor 1: second floor
      width:1600, height:1000,
      walls:[
        {x:0,y:0,w:1600,h:24},
        {x:0,y:976,w:1600,h:24},
        {x:0,y:0,w:24,h:1000},
        {x:1576,y:0,w:24,h:1000},
        {x:300,y:160,w:900,h:24},
        {x:300,y:160,w:24,h:320},
        {x:900,y:480,w:24,h:360},
        {x:1160,y:240,w:220,h:24}
      ],
      scanPoints:[],
      stairs:[{x:1450,y:860,w:80,h:120,toFloor:2},{x:60,y:860,w:80,h:120,toFloor:0}],
      exit:{x:60,y:860,w:80,h:120,active:true}
    },
    { // floor 2: basement
      width:1600, height:1000,
      walls:[
        {x:0,y:0,w:1600,h:24},
        {x:0,y:976,w:1600,h:24},
        {x:0,y:0,w:24,h:1000},
        {x:1576,y:0,w:24,h:1000},
        {x:220,y:160,w:700,h:24},
        {x:220,y:160,w:24,h:260},
        {x:900,y:420,w:24,h:320},
        {x:1050,y:620,w:320,h:24}
      ],
      scanPoints:[],
      stairs:[{x:1450,y:860,w:80,h:120,toFloor:1}],
      exit:{x:60,y:860,w:80,h:120,active:true}
    }
  ];

  const deviceTypes = {
    acid: {
      type:'acid', name:'Acid', color:'#9f7aea', noiseRadius:70,
      placeTime:1.6, preferred:['brick','masonry','steel'], desc:'Best on masonry and brick, quiet to place.'
    },
    explosive: {
      type:'explosive', name:'Explosive', color:'#ff6b6b', noiseRadius:120,
      placeTime:2.2, preferred:['steel','concrete'], desc:'High-impact on supports, louder to carry.'
    },
    press: {
      type:'press', name:'Press', color:'#ffb703', noiseRadius:90,
      placeTime:1.8, preferred:['concrete','steel'], desc:'Mechanical device for concrete columns and framing.'
    }
  };

  let loadout = ['acid','explosive','press','acid'];
  let inventory = [];
  let holdPlacement = {spot:null, timer:0};
  let gameState = 'playing'; // playing, finished
  let placementLog = [];
  let exitInfoShown = false;

  function getDeviceData(type){
    return deviceTypes[type] || null;
  }
  function buildInventory(){
    inventory = loadout.filter(Boolean).slice(0,4);
    player.carrying = inventory.shift() || null;
  }
  function getCurrentDevice(){
    return player.carrying ? getDeviceData(player.carrying) : null;
  }
  function getPlacementCount(){
    return levels[0].placementSpots.filter(s=>s.placedDevice).length;
  }
  function getTotalPlacementSlots(){
    return levels[0].placementSpots.length;
  }
  function buildPlacementMap(){
    return {
      level: 0,
      placedSpots: levels[0].placementSpots.map(s=>({
        id:s.id,
        x:s.x,
        y:s.y,
        material:s.material,
        confidence:s.confidence,
        placedDevice:s.placedDevice,
        fit: s.placedDevice ? (getDeviceData(s.placedDevice).preferred.includes(s.material) ? 'good' : 'weak') : 'none'
      })),
      inventoryRemaining: inventory.map(t=>({type:t}))
    };
  }

  function getRestockInfo(){
    return [
      `${deviceTypes.acid.name}: Best on masonry/brick/steel, quiet to place.`,
      `${deviceTypes.explosive.name}: Best on steel/concrete supports, powerful but noisy.`,
      `${deviceTypes.press.name}: Best on concrete columns and framing, mechanical.`
    ].join(' ');
  }

  // Player
  const player = {
    x:120, y:200, r:14, speed:240, floor:0, carrying:null
  };

  // Watchers (guards and cameras)
  const watchers = [
    {
      id:'guard-ground', type:'guard', x:600,y:700,floor:0,speed:120,
      waypoints:[{x:600,y:700},{x:1200,y:700},{x:1200,y:300},{x:600,y:300}], idx:0,
      fov:Math.PI*0.6, viewDist:420
    },
    {
      id:'guard-second', type:'guard', x:420,y:320,floor:1,speed:100,
      waypoints:[{x:420,y:320},{x:980,y:320},{x:980,y:760},{x:420,y:760}], idx:0,
      fov:Math.PI*0.6, viewDist:360
    },
    {
      id:'camera-basement-1', type:'camera', x:420,y:260,floor:2,
      fov:Math.PI*0.55, viewDist:320, facingAngle:Math.PI/6
    },
    {
      id:'camera-basement-2', type:'camera', x:1180,y:620,floor:2,
      fov:Math.PI*0.55, viewDist:320, facingAngle:Math.PI*0.95
    },
    {
      id:'camera-second', type:'camera', x:1040,y:240,floor:1,
      fov:Math.PI*0.55, viewDist:320, facingAngle:Math.PI/2
    }
  ];

  // Game state
  let last = performance.now();
  let heat = 0; // 0..1
  const heatIncreaseSeen = 0.18;
  const heatDecrease = 0.08;
  let caught = false;
  let win = false;
  const scoreState = {
    completedPhases: 0,
    totalScore: 0,
    phaseScore: 0,
    heatPenalty: 0
  };

  function resetLevel() {
    levels.forEach(lev=>{
      if(lev.placementSpots) lev.placementSpots.forEach(s=>s.placedDevice=null);
    });
    player.floor = 0; player.carrying=null;
    const startExit = levels[0].exit;
    if(startExit){
      player.x = startExit.x + startExit.w + player.r + 8;
      player.y = startExit.y + startExit.h/2;
    } else {
      player.x = 120; player.y = 200;
    }
    watchers.forEach(w=>{
      if(w.type==='guard') w.idx = 0;
    });
    heat = 0; caught=false; win=false;
    levels.forEach(l=>l.exit.active=true);
    holdPlacement = {spot:null, timer:0};
    placementLog = [];
    buildInventory();
  }

  function getRating(percent){
    if(percent >= 0.9) return 'S';
    if(percent >= 0.75) return 'A';
    if(percent >= 0.5) return 'B';
    if(percent >= 0.25) return 'C';
    return 'D';
  }

  function calculatePhaseScore(){
    const heatPenalty = Math.round(heat * 100);
    const phaseScore = Math.max(0, Math.round((1000) - (heatPenalty * 5)));
    scoreState.heatPenalty = heatPenalty;
    scoreState.phaseScore = phaseScore;
    return { heatPenalty, phaseScore };
  }

  function updateScoreHud(){
    const { phaseScore, heatPenalty } = calculatePhaseScore();
    const rating = getRating(1);
    const current = getCurrentDevice();
    document.getElementById('phaseScoreVal').textContent = phaseScore;
    document.getElementById('totalScoreVal').textContent = scoreState.totalScore;
    document.getElementById('ratingVal').textContent = `${rating} Rank`;
    document.getElementById('heatVal').textContent = `${Math.round(heat * 100)}%`;
    document.getElementById('carryVal').textContent = current ? current.name : 'None';
    document.getElementById('devicesVal').textContent = inventory.length;
    document.getElementById('placementsVal').textContent = `${getPlacementCount()}/${getTotalPlacementSlots()}`;
    document.getElementById('floorVal').textContent = `${player.floor + 1}/${levels.length}`;
    return { phaseScore, heatPenalty, rating };
  }

  // collision circle-rect
  function circleRectCollision(cx,cy,r,rect){
    const rx = clamp(cx, rect.x, rect.x+rect.w);
    const ry = clamp(cy, rect.y, rect.y+rect.h);
    return dist(cx,cy,rx,ry) <= r;
  }

  // Robust LOS: step along the segment and check if any sample point lies inside a wall rect
  function isLineBlockedByWalls(x1,y1,x2,y2,floorIndex){
    const dx = x2-x1, dy = y2-y1;
    const distTotal = Math.hypot(dx,dy);
    const step = 8;
    const steps = Math.max(1, Math.floor(distTotal / step));
    for(let i=1;i<=steps;i++){
      const t = i/steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      for(const rect of levels[floorIndex].walls){
        if(px > rect.x && px < rect.x + rect.w && py > rect.y && py < rect.y + rect.h) return true;
      }
    }
    return false;
  }

  function angleDiff(a,b){
    let d = a-b;
    while(d>Math.PI) d-=2*Math.PI;
    while(d<-Math.PI) d+=2*Math.PI;
    return d;
  }

  function watcherSeesPlayer(watcher){
    if(player.floor !== watcher.floor) return false;
    const dx = player.x - watcher.x;
    const dy = player.y - watcher.y;
    const d = Math.hypot(dx,dy);
    if(d > watcher.viewDist) return false;
    const ang = Math.atan2(dy,dx);
    const facing = watcher.type === 'guard'
      ? Math.atan2(getGuardTarget(watcher).y - watcher.y, getGuardTarget(watcher).x - watcher.x)
      : watcher.facingAngle;
    const a = Math.abs(angleDiff(facing, ang));
    if(a > watcher.fov/2) return false;
    return !isLineBlockedByWalls(watcher.x, watcher.y, player.x, player.y, watcher.floor);
  }

  function getGuardTarget(watcher){
    return watcher.waypoints[watcher.idx] || {x: watcher.x, y: watcher.y};
  }

  // Raycast from point along angle until hitting a wall or maxDist
  function raycastToWall(gx,gy,angle,maxDist,floorIndex){
    const step = 6;
    for(let t=0;t<=maxDist;t+=step){
      const px = gx + Math.cos(angle)*t;
      const py = gy + Math.sin(angle)*t;
      for(const r of levels[floorIndex].walls){
        if(px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h){
          const prevT = Math.max(0, t - step);
          return {x: gx + Math.cos(angle)*prevT, y: gy + Math.sin(angle)*prevT};
        }
      }
    }
    return {x: gx + Math.cos(angle)*maxDist, y: gy + Math.sin(angle)*maxDist};
  }

  function computeVisionPolygon(watcher){
    const pts = [];
    const facing = watcher.type === 'guard'
      ? Math.atan2(getGuardTarget(watcher).y - watcher.y, getGuardTarget(watcher).x - watcher.x)
      : watcher.facingAngle;
    const angleStep = (2 * Math.PI) / 180;
    const start = facing - watcher.fov/2;
    const end = facing + watcher.fov/2;
    for(let a = start; a <= end + 1e-6; a += angleStep){
      pts.push(raycastToWall(watcher.x, watcher.y, a, watcher.viewDist, watcher.floor));
    }
    return pts;
  }

  function update(dt){
    if(caught || win) return;

    // player movement
    let vx = (input.right - input.left);
    let vy = (input.down - input.up);
    if(vx!==0 || vy!==0){
      const len = Math.hypot(vx,vy);
      vx /= len||1; vy /= len||1;
      player.x += vx * player.speed * dt;
      player.y += vy * player.speed * dt;
    }

    const floor = levels[player.floor];
    for(const w of floor.walls){
      if(circleRectCollision(player.x,player.y,player.r,w)){
        if(vx||vy){
          player.x -= vx * player.speed * dt;
          player.y -= vy * player.speed * dt;
        }
      }
    }

    // stairs: transfer between floors
    for(const s of floor.stairs){
      if(player.x > s.x && player.x < s.x + s.w && player.y > s.y && player.y < s.y + s.h){
        const dest = s.toFloor;
        player.floor = dest;
        const destStairs = levels[dest].stairs && levels[dest].stairs[0];
        if(destStairs){
          const leftX = destStairs.x - player.r - 8;
          const rightX = destStairs.x + destStairs.w + player.r + 8;
          if(leftX > 24) player.x = leftX; else player.x = rightX;
          player.y = destStairs.y + destStairs.h/2;
        }
      }
    }

    // placement interaction
    if(gameState === 'playing'){
      const current = getCurrentDevice();
      const spots = floor.placementSpots || [];
      let targetSpot = null;
      for(const spot of spots){
        if(!spot.placedDevice && dist(player.x,player.y,spot.x,spot.y) <= spot.r + player.r){
          targetSpot = spot;
          break;
        }
      }
      if(current && targetSpot && input.action){
        if(holdPlacement.spot !== targetSpot){
          holdPlacement = {spot: targetSpot, timer: 0};
        }
        holdPlacement.timer += dt;
        if(holdPlacement.timer >= current.placeTime){
          targetSpot.placedDevice = current.type;
          placementLog.push({spotId: targetSpot.id, device: current.type, material: targetSpot.material, confidence: targetSpot.confidence});
          player.carrying = null;
          holdPlacement = {spot:null, timer:0};
        }
      } else {
        if(targetSpot !== holdPlacement.spot) holdPlacement.timer = 0;
      }
    }

    // restock and info at exit
    const ex = floor.exit;
    const atExit = player.x > ex.x && player.x < ex.x + ex.w && player.y > ex.y && player.y < ex.y + ex.h;
    if(atExit && !exitInfoShown){
      if(gameState === 'playing' && !player.carrying && inventory.length > 0){
        player.carrying = inventory.shift();
        showOverlay(`Restocked with ${getCurrentDevice().name}. ${getRestockInfo()}`, 'info');
      } else {
        showOverlay(`Exit point. Devices available: ${getRestockInfo()}`, 'info');
      }
      exitInfoShown = true;
      setTimeout(hideOverlay, 3200);
    }
    if(!atExit) exitInfoShown = false;

    // watcher movement and detection
    let seenByWatcher = false;
    watchers.forEach(w=>{
      if(w.type==='guard'){
        const target = w.waypoints[w.idx];
        const gdx = target.x - w.x;
        const gdy = target.y - w.y;
        const gd = Math.hypot(gdx,gdy);
        if(gd < 6){
          w.idx = (w.idx + 1) % w.waypoints.length;
        } else {
          const gx = (gdx/gd) * w.speed * dt;
          const gy = (gdy/gd) * w.speed * dt;
          const trialX = w.x + gx;
          const trialY = w.y + gy;
          const blocked = levels[w.floor].walls.some(rect=>circleRectCollision(trialX,trialY,18,rect));
          if(!blocked){
            w.x = trialX; w.y = trialY;
          } else {
            w.idx = (w.idx + 1) % w.waypoints.length;
          }
        }
      }
      if(watcherSeesPlayer(w)) seenByWatcher = true;
    });

    let heardByGuard = false;
    if(player.carrying){
      const noise = getCurrentDevice().noiseRadius;
      for(const w of watchers){
        if(w.floor !== player.floor || w.type !== 'guard') continue;
        if(dist(player.x,player.y,w.x,w.y) <= noise){
          heardByGuard = true;
          break;
        }
      }
    }
    if(seenByWatcher){
      heat += heatIncreaseSeen * dt;
    } else if(heardByGuard){
      heat += 0.12 * dt;
    }
    if(heat > 0 && !seenByWatcher && !heardByGuard){
      heat = clamp(heat - heatDecrease * dt, 0, 1);
    }
    heat = clamp(heat,0,1);

    if(holdPlacement.spot){
      const current = getCurrentDevice();
      if(current && (seenByWatcher || heardByGuard)){
        showOverlay('Placement interrupted! Device lost.', 'lose');
        player.carrying = null;
        holdPlacement = {spot:null, timer:0};
        setTimeout(()=>{ document.getElementById('overlay').classList.add('hidden'); }, 1200);
      }
    }

    if(heat >= 1){
      caught = true;
      showOverlay('Caught! Restarting...', 'lose');
      setTimeout(()=>{ resetLevel(); hideOverlay(); }, 1200);
    }

    if(gameState === 'playing'){
      if((inventory.length === 0 && !player.carrying) || input.escape){
        const placementMap = buildPlacementMap();
        placementLog = placementMap.placedSpots;
        window.__placementMap = placementMap;
        win = true;
        showOverlay('Placement complete! Map logged to console.', 'win');
        console.log('Placement map:', placementMap);
        gameState = 'finished';
      }
    }

    updateScoreHud();
  }

  function showOverlay(text, cls){
    const o = document.getElementById('overlay');
    o.innerHTML = text; o.className = '';
    if(cls==='win') o.classList.add('win');
    if(cls==='lose') o.classList.add('lose');
    if(cls==='info') o.classList.add('info');
    o.classList.remove('hidden');
  }
  function hideOverlay(){ document.getElementById('overlay').classList.add('hidden'); }

  function draw(){
    ctx.clearRect(0,0,W,H);
    const lev = levels[player.floor];
    const camx = clamp(player.x - W/2, 0, Math.max(0, lev.width - W));
    const camy = clamp(player.y - H/2, 0, Math.max(0, lev.height - H));
    ctx.fillStyle = '#061029'; ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.translate(-camx, -camy);

    // walls
    ctx.fillStyle = '#223';
    for(const w of lev.walls) ctx.fillRect(w.x, w.y, w.w, w.h);

    // placement spots
    for(const spot of lev.placementSpots || []){
      ctx.beginPath(); ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI*2);
      ctx.fillStyle = spot.placedDevice ? 'rgba(90,200,140,0.28)' : 'rgba(210,185,95,0.14)';
      ctx.fill();
      ctx.strokeStyle = spot.placedDevice ? '#78c084' : '#f0d575'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(spot.material, spot.x, spot.y - spot.r - 6);
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

    // exit
    ctx.fillStyle = lev.exit.active ? 'rgba(255,200,90,0.45)' : 'rgba(80,80,80,0.35)';
    ctx.fillRect(lev.exit.x, lev.exit.y, lev.exit.w, lev.exit.h);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(lev.exit.x, lev.exit.y, lev.exit.w, lev.exit.h);
    ctx.fillStyle = '#111'; ctx.font = '18px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lev.exit.active ? 'EXIT' : 'Exit', lev.exit.x + lev.exit.w/2, lev.exit.y + lev.exit.h/2);

    // watchers
    watchers.forEach(watcher=>{
      if(watcher.floor !== player.floor) return;
      const visionPts = computeVisionPolygon(watcher);
      if(visionPts.length){
        ctx.beginPath(); ctx.moveTo(watcher.x, watcher.y);
        for(const p of visionPts) ctx.lineTo(p.x, p.y);
        ctx.closePath(); ctx.fillStyle = watcher.type === 'guard' ? 'rgba(200,120,120,0.08)' : 'rgba(255,240,120,0.08)'; ctx.fill();
      }
      if(watcher.type === 'guard'){
        ctx.fillStyle = '#e07a5f'; ctx.beginPath(); ctx.arc(watcher.x,watcher.y,18,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#300'; ctx.font='14px sans-serif'; ctx.fillText('G', watcher.x-6, watcher.y+6);
      } else {
        ctx.fillStyle = '#d8d8d8'; ctx.beginPath(); ctx.arc(watcher.x,watcher.y,16,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.fillRect(watcher.x-10, watcher.y-8, 20, 10);
        ctx.fillStyle='#000'; ctx.font='12px sans-serif'; ctx.fillText('C', watcher.x-4, watcher.y+5);
      }
    });

    // draw stairs
    for(const s of lev.stairs){
      ctx.fillStyle = 'rgba(180,180,220,0.12)'; ctx.fillRect(s.x,s.y,s.w,s.h);
      ctx.strokeStyle = '#cfc'; ctx.strokeRect(s.x,s.y,s.w,s.h);
      ctx.fillStyle = '#fff'; ctx.font='14px sans-serif'; ctx.fillText('STAIRS', s.x + s.w/2, s.y + s.h/2);
    }

    // player noise radius when carrying
    const currentDevice = getCurrentDevice();
    if(currentDevice && gameState === 'playing'){
      ctx.beginPath(); ctx.arc(player.x, player.y, currentDevice.noiseRadius, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // player
    ctx.fillStyle='#9ad3bc'; ctx.beginPath(); ctx.arc(player.x,player.y,player.r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#083'; ctx.lineWidth=2; ctx.stroke();

    ctx.restore();

    // HUD heat bar
    const hx = 10, hy = H - 44, hw = 160, hh = 18;
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(hx-2, hy-2, hw+4, hh+4);
    ctx.fillStyle = '#ff595e'; ctx.fillRect(hx,hy,hw*heat,hh);
    ctx.strokeStyle='#fff'; ctx.strokeRect(hx,hy,hw,hh);
  }

  function loop(now){
    const dt = Math.min(0.05, (now - last)/1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  window.__reconScoreState = scoreState;
  resetLevel();
  requestAnimationFrame(loop);
})();