/* Recon prototype: Phase 1
   Simple top-down canvas game with floors, scan points, guard patrol, heat meter.
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
  const input = {up:0,down:0,left:0,right:0};
  window.addEventListener('keydown', e=>{
    if(e.key==='ArrowUp'||e.key==='w') input.up=1;
    if(e.key==='ArrowDown'||e.key==='s') input.down=1;
    if(e.key==='ArrowLeft'||e.key==='a') input.left=1;
    if(e.key==='ArrowRight'||e.key==='d') input.right=1;
  });
  window.addEventListener('keyup', e=>{
    if(e.key==='ArrowUp'||e.key==='w') input.up=0;
    if(e.key==='ArrowDown'||e.key==='s') input.down=0;
    if(e.key==='ArrowLeft'||e.key==='a') input.left=0;
    if(e.key==='ArrowRight'||e.key==='d') input.right=0;
  });

  // Level definition: two floors
  const levels = [
    { // floor 0
      width:1600, height:1000,
      walls:[
        {x:0,y:0,w:1600,h:24},
        {x:0,y:976,w:1600,h:24},
        {x:0,y:0,w:24,h:1000},
        {x:1576,y:0,w:24,h:1000},
        // interior walls
        {x:200,y:120,w:800,h:24},
        {x:200,y:120,w:24,h:400},
        {x:1000,y:400,w:24,h:380},
        {x:400,y:500,w:600,h:24},
      ],
      scanPoints:[
        {x:150,y:200,r:36,scanned:false},
        {x:860,y:150,r:36,scanned:false},
        {x:1200,y:700,r:36,scanned:false}
      ],
      // stairs placed in the same map area on each floor
      stairs:[{x:1450,y:860,w:80,h:120,toFloor:1}],
      exit:{x:60,y:860,w:80,h:120,active:false}
    },
    { // floor 1
      width:1600, height:1000,
      walls:[
        {x:0,y:0,w:1600,h:24},
        {x:0,y:976,w:1600,h:24},
        {x:0,y:0,w:24,h:1000},
        {x:1576,y:0,w:24,h:1000},
        {x:300,y:160,w:900,h:24},
        {x:300,y:160,w:24,h:320},
        {x:900,y:480,w:24,h:360},
      ],
      scanPoints:[
        {x:420,y:240,r:36,scanned:false},
        {x:100,y:800,r:36,scanned:false}
      ],
      // same stairs location as floor 0 so they align vertically
      stairs:[{x:1450,y:860,w:80,h:120,toFloor:0}],
      exit:{x:1450,y:860,w:80,h:120,active:false}
    }
  ];

  // Player
  const player = {
    x:120, y:200, r:14, speed:240, floor:0, scanTime:0
  };

  // Guard
  const guard = {
    x:600,y:700,floor:0,speed:120,waypoints:[{x:600,y:700},{x:1200,y:700},{x:1200,y:300},{x:600,y:300}],
    idx:0, fov:Math.PI*0.6, viewDist:420
  };

  // Game state
  let last = performance.now();
  let heat = 0; // 0..1
  // Heat rates (per second)
  const heatIncreaseScan = 0.9; // when player is on an unscanned scan point
  const heatIncreaseSeen = 0.18; // when seen elsewhere (significantly slower)
  const heatDecrease = 0.08; // slower decay when unseen
  let caught = false;
  let win = false;
  const scanRequiredTime = 2.0; // seconds

  function resetLevel() {
    // reset scans
    levels.forEach((lev,i)=>lev.scanPoints.forEach(s=>s.scanned=false));
    player.floor = 0; player.scanTime=0;
    // place player next to the exit on floor 0 (likely entry point)
    const startExit = levels[0].exit;
    if(startExit){
      // place player to the right of the exit
      player.x = startExit.x + startExit.w + player.r + 8;
      player.y = startExit.y + startExit.h/2;
    } else {
      // fallback: center of first stairs
      const startStairs = levels[0].stairs && levels[0].stairs[0];
      if(startStairs){ player.x = startStairs.x + startStairs.w/2; player.y = startStairs.y + startStairs.h/2; }
      else { player.x = 120; player.y = 200; }
    }
    heat = 0; caught=false; win=false;
    // reset exit
    levels.forEach(l=>l.exit.active=false);
  }

  function allScanned(){
    return levels.every(l=>l.scanPoints.every(s=>s.scanned));
  }

  // collision circle-rect
  function circleRectCollision(cx,cy,r,rect){
    const rx = clamp(cx, rect.x, rect.x+rect.w);
    const ry = clamp(cy, rect.y, rect.y+rect.h);
    return dist(cx,cy,rx,ry) <= r;
  }

  // Line intersects rect
  function lineIntersectsRect(x1,y1,x2,y2,rect){
    // check intersection with each side
    const lines = [
      [rect.x,rect.y,rect.x+rect.w,rect.y],
      [rect.x+rect.w,rect.y,rect.x+rect.w,rect.y+rect.h],
      [rect.x+rect.w,rect.y+rect.h,rect.x,rect.y+rect.h],
      [rect.x,rect.y+rect.h,rect.x,rect.y]
    ];
    for(const l of lines){
      if(segIntersection(x1,y1,x2,y2,...l)) return true;
    }
    return false;
  }
  function segIntersection(x1,y1,x2,y2,x3,y3,x4,y4){
    const denom = (y4-y3)*(x2-x1)-(x4-x3)*(y2-y1);
    if(denom===0) return false;
    const ua = ((x4-x3)*(y1-y3)-(y4-y3)*(x1-x3))/denom;
    const ub = ((x2-x1)*(y1-y3)-(y2-y1)*(x1-x3))/denom;
    return ua>=0 && ua<=1 && ub>=0 && ub<=1;
  }
  // Robust LOS: step along the segment and check if any sample point lies inside a wall rect
  function isLineBlockedByWalls(x1,y1,x2,y2,floorIndex){
    const dx = x2-x1, dy = y2-y1;
    const distTotal = Math.hypot(dx,dy);
    const step = 8; // pixels per sample
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

  function guardSeesPlayer(){
    if(player.floor !== guard.floor) return false;
    const dx = player.x - guard.x;
    const dy = player.y - guard.y;
    const d = Math.hypot(dx,dy);
    if(d > guard.viewDist) return false;
    const ang = Math.atan2(dy,dx);
    // guard facing direction based on waypoint
    const wp = guard.waypoints[guard.idx];
    const facing = Math.atan2(wp.y-guard.y,wp.x-guard.x);
    let a = Math.abs(angleDiff(facing, ang));
    if(a > guard.fov/2) return false;
    // line of sight: robust check using sampling to avoid seeing through walls
    if(isLineBlockedByWalls(guard.x,guard.y,player.x,player.y, guard.floor)) return false;
    return true;
  }
  function angleDiff(a,b){
    let d = a-b;
    while(d>Math.PI) d-=2*Math.PI;
    while(d<-Math.PI) d+=2*Math.PI;
    return d;
  }

  // Raycast from point along angle until hitting a wall or maxDist
  function raycastToWall(gx,gy,angle,maxDist,floorIndex){
    const step = 6;
    for(let t=0;t<=maxDist;t+=step){
      const px = gx + Math.cos(angle)*t;
      const py = gy + Math.sin(angle)*t;
      for(const r of levels[floorIndex].walls){
        if(px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h){
          // return a point slightly before the wall to avoid drawing inside it
          const prevT = Math.max(0, t - step);
          return {x: gx + Math.cos(angle)*prevT, y: gy + Math.sin(angle)*prevT};
        }
      }
    }
    return {x: gx + Math.cos(angle)*maxDist, y: gy + Math.sin(angle)*maxDist};
  }

  // Build array of visible points (occluded by walls) within guard FOV
  function computeVisionPolygon(guard){
    const pts = [];
    const wp = guard.waypoints[guard.idx];
    const facing = Math.atan2(wp.y-guard.y, wp.x-guard.x);
    const angleStep = (2 * Math.PI) / 180; // ~2 degrees
    const start = facing - guard.fov/2;
    const end = facing + guard.fov/2;
    for(let a = start; a <= end + 1e-6; a += angleStep){
      const p = raycastToWall(guard.x, guard.y, a, guard.viewDist, guard.floor);
      pts.push(p);
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
    // player collision with walls on current floor
    const floor = levels[player.floor];
    for(const w of floor.walls){
      if(circleRectCollision(player.x,player.y,player.r,w)){
        // simple push out: move back along velocity
        if(vx||vy){
          player.x -= vx * player.speed * dt;
          player.y -= vy * player.speed * dt;
        }
      }
    }
    // stairs: when player overlaps, transfer them to the destination floor and place them on the stairs there
    for(const s of floor.stairs){
      if(player.x > s.x && player.x < s.x + s.w && player.y > s.y && player.y < s.y + s.h){
        // transfer
        const dest = s.toFloor;
        player.floor = dest;
        // find first stairs on destination floor and place player just to the side of them
        const destStairs = levels[dest].stairs && levels[dest].stairs[0];
        if(destStairs){
          // prefer placing player to the left of the stairs if there's room, otherwise to the right
          const leftX = destStairs.x - player.r - 8;
          const rightX = destStairs.x + destStairs.w + player.r + 8;
          // choose the side with more space from the left boundary
          if(leftX > 24) player.x = leftX; else player.x = rightX;
          player.y = destStairs.y + destStairs.h/2;
        }
        player.scanTime = 0;
      }
    }
    // scan points
    let inScan = null;
    for(const s of floor.scanPoints){
      if(!s.scanned){
        if(dist(player.x,player.y,s.x,s.y) <= s.r + player.r){
          inScan = s; break;
        }
      }
    }
    if(inScan){
      player.scanTime += dt;
      if(player.scanTime >= scanRequiredTime){
        inScan.scanned = true;
        player.scanTime = 0;
      }
    } else player.scanTime = 0;

    // guard movement along waypoints (on guard.floor)
    const gfloor = levels[guard.floor];
    const target = guard.waypoints[guard.idx];
    const gdx = target.x - guard.x;
    const gdy = target.y - guard.y;
    const gd = Math.hypot(gdx,gdy);
    if(gd < 6){ guard.idx = (guard.idx+1) % guard.waypoints.length; }
    else { const gx = (gdx/gd) * guard.speed * dt; const gy = (gdy/gd)*guard.speed*dt; guard.x += gx; guard.y += gy; }

    // detection
    const seen = guardSeesPlayer();
    if(seen){
      // increase faster if player is actively scanning an unscanned point, much slower otherwise
      const rate = inScan ? heatIncreaseScan : heatIncreaseSeen;
      heat += rate * dt;
    }
    else { heat -= heatDecrease * dt; }
    heat = clamp(heat,0,1);
    if(heat >= 1){ caught = true; showOverlay('Caught! Restarting...', 'lose'); setTimeout(()=>{ resetLevel(); hideOverlay(); },1200); }

    // if all scanned, activate exits
    if(allScanned()) levels.forEach(l=>l.exit.active=true);
    // check exit
    for(const [i,l] of levels.entries()){
      if(l.exit.active && player.floor===i){
        if(player.x > l.exit.x && player.x < l.exit.x + l.exit.w && player.y > l.exit.y && player.y < l.exit.y + l.exit.h){
          win = true; showOverlay('Recon complete! You escaped.','win');
        }
      }
    }

    // update HUD
    document.getElementById('heatVal').textContent = Math.round(heat*100)+'%';
    const total = levels.reduce((a,l)=>a+l.scanPoints.length,0);
    const done = levels.reduce((a,l)=>a+l.scanPoints.filter(s=>s.scanned).length,0);
    document.getElementById('scansVal').textContent = done + '/' + total;
    document.getElementById('floorVal').textContent = (player.floor+1) + '/' + levels.length;
  }

  function showOverlay(text, cls){
    const o = document.getElementById('overlay');
    o.textContent = text; o.className = '';
    if(cls==='win') o.classList.add('win');
    if(cls==='lose') o.classList.add('lose');
    o.classList.remove('hidden');
  }
  function hideOverlay(){ document.getElementById('overlay').classList.add('hidden'); }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // camera: center on player, but clamp to level bounds
    const lev = levels[player.floor];
    const camx = clamp(player.x - W/2, 0, Math.max(0, lev.width - W));
    const camy = clamp(player.y - H/2, 0, Math.max(0, lev.height - H));
    // draw floor background
    ctx.fillStyle = '#061029'; ctx.fillRect(0,0,W,H);
    // translate
    ctx.save(); ctx.translate(-camx, -camy);

    // walls
    ctx.fillStyle = '#223';
    for(const w of lev.walls) ctx.fillRect(w.x, w.y, w.w, w.h);

    // scan points
    for(const s of lev.scanPoints){
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle = s.scanned ? 'rgba(100,200,120,0.35)' : 'rgba(120,160,255,0.12)';
      ctx.fill();
      ctx.strokeStyle = s.scanned ? '#6fcca6' : '#7fa8ff'; ctx.lineWidth = 2; ctx.stroke();
      if(!s.scanned && dist(player.x,player.y,s.x,s.y) <= s.r + player.r){
        // draw progress
        const p = clamp(player.scanTime/scanRequiredTime,0,1);
        ctx.beginPath(); ctx.arc(s.x,s.y, s.r+8, -Math.PI/2, -Math.PI/2 + Math.PI*2*p);
        ctx.strokeStyle = '#ffdc7a'; ctx.lineWidth = 4; ctx.stroke();
      }
    }

    // exit
    ctx.fillStyle = lev.exit.active ? 'rgba(255,200,90,0.45)' : 'rgba(80,80,80,0.35)';
    ctx.fillRect(lev.exit.x, lev.exit.y, lev.exit.w, lev.exit.h);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(lev.exit.x, lev.exit.y, lev.exit.w, lev.exit.h);
    // exit label
    ctx.fillStyle = '#111'; ctx.font = '18px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lev.exit.active ? 'EXIT' : 'Exit', lev.exit.x + lev.exit.w/2, lev.exit.y + lev.exit.h/2);

    // guard (only draw guard for their floor)
    if(guard.floor === player.floor){
        // vision polygon occluded by walls
        const visionPts = computeVisionPolygon(guard);
        if(visionPts.length){
          ctx.beginPath(); ctx.moveTo(guard.x, guard.y);
          for(const p of visionPts) ctx.lineTo(p.x, p.y);
          ctx.closePath(); ctx.fillStyle='rgba(200,120,120,0.08)'; ctx.fill();
        }
      // guard body
      ctx.fillStyle = '#e07a5f'; ctx.beginPath(); ctx.arc(guard.x,guard.y,18,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#300'; ctx.font='14px sans-serif'; ctx.fillText('G', guard.x-6, guard.y+6);
    }

    // draw stairs
    for(const s of lev.stairs){
      ctx.fillStyle = 'rgba(180,180,220,0.12)'; ctx.fillRect(s.x,s.y,s.w,s.h);
      ctx.strokeStyle = '#cfc'; ctx.strokeRect(s.x,s.y,s.w,s.h);
      ctx.fillStyle = '#fff'; ctx.font='14px sans-serif'; ctx.fillText('STAIRS', s.x + s.w/2, s.y + s.h/2);
    }

    // player
    ctx.fillStyle='#9ad3bc'; ctx.beginPath(); ctx.arc(player.x,player.y,player.r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#083'; ctx.lineWidth=2; ctx.stroke();

    ctx.restore();

    // HUD heat bar
    const hx = 10, hy = H - 44, hw = 160, hh = 18;
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(hx-2, hy-2, hw+4, hh+4);
    ctx.fillStyle = 'linear-gradient(to right,#f55,#ff5)';
    ctx.fillStyle = '#442'; ctx.fillRect(hx,hy,hw,hh);
    ctx.fillStyle = '#ff595e'; ctx.fillRect(hx,hy, hw*heat, hh);
    ctx.strokeStyle='#fff'; ctx.strokeRect(hx,hy,hw,hh);
  }

  function loop(now){
    const dt = Math.min(0.05, (now - last)/1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // init
  resetLevel();
  requestAnimationFrame(loop);
})();