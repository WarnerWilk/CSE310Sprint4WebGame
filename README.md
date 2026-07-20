Saboteur: A Stealthy Physics Destruction Game!

A browser-based stealth/physics game in the spirit of classic Flash-era web games. You play a saboteur-for-hire who secretly demolishes buildings so the destruction looks like an accident rather than sabotage — insurance-fraud and corporate-sabotage territory. Every job happens at night on an empty building, and unfolds in three phases:

Recon — sneak through the building floor by floor, locating and scanning structural weak points while avoiding patrolling guards and security cameras.
Placement — sneak back in at night and place a limited set of sabotage devices (acid, explosives, hydraulic presses) at the weak points discovered during Recon. There are always more viable spots than devices, so choices matter.
Detonation — trigger the placed devices, in whatever order and timing you choose, and watch structural stress cascade through the building (visualized on a green-to-red scale) until it collapses.

Built entirely in vanilla HTML, CSS, and JavaScript, rendered on an HTML5 <canvas>, with no build tools or external dependencies required.

Instructions for Build and Use

Steps to build and/or run the software:

Clone or download this repository to your local machine.
Ensure the three project files (index.html, style.css, game.js) are in the same folder.
Open index.html directly in a modern web browser (Chrome, Firefox, or Edge) — either by double-clicking the file or by serving the folder with a simple local server (e.g. npx serve or the VS Code "Live Server" extension) if your browser restricts local file access.

Instructions for using the software:

Use WASD or the arrow keys to move your character around the current floor.
During Recon, walk into the marked scan circles and stay inside them until the progress ring fills to reveal a structural weak point; avoid guard sightlines and camera cones to keep your heat meter low.
Reach the ground floor exit and press ESC (or E while standing in the exit) to finish Recon and advance to Placement.
During Placement, hold E near a scanned weak point to place a carried device; return to the exit to restock when you run out. Press ESC at the exit when you're done placing devices to advance to Detonation.
During Detonation, trigger each device to cause structural damage to the building; watch the support structure's stress levels shift from green to red as the building weakens toward collapse.

Development Environment

To recreate the development environment, you need the following software and/or libraries with the specified versions:

A modern web browser with HTML5 Canvas support (Chrome, Firefox, or Edge — any recent version)
A code editor (Visual Studio Code was used during development)
Git for version control
No package manager, framework, or build tool is required — the project is plain HTML5/CSS3/ES6 JavaScript
Useful Websites to Learn More

I used Claude for developing the ideas for the code, and CoPilot and Gemini for code implementation. 
I would then go to Claude to help me identify
points that the other AIs missed and continue to iterate until I got what I have now.

The following items I plan to fix, improve, and/or add to this project in the future:

 Add sound effects and ambient audio (footsteps, alarms, collapse rumble)
 Build out the suspicion/messiness scoring for the Detonation phase and show a post-level "newspaper headline" results screen
 Add in more levels, with each level having the current 3-phase progression.
 Add a level-select map with star ratings across multiple buildings
 Polish collapse visuals (debris, dust, camera shake) beyond the current stress-color and cracking indicators
 Add save/progress persistence between sessions
 Tune and expand guard/camera placement and difficulty across levels
