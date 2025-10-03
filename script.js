import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class Dice {
  constructor(scene, world, position = { x: 0, y: 5, z: 0 }) {
    this.scene = scene;
    this.world = world;
    this.size = 1;
    
    // Create the visual representation (Three.js mesh)
    this.createVisualDice();
    
    // Create the physics body (Cannon.js body)
    this.createPhysicsBody(position);
    
    // Link the visual and physics together
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  }
  
  createVisualDice() {
    // Create geometry for the dice
    const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
    
    // Create materials for each face with numbers
    const materials = this.createDiceMaterials();
    
    // Create the mesh with the materials
    this.mesh = new THREE.Mesh(geometry, materials);
    
    // Add edges for better visibility
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
    this.mesh.add(wireframe);
    
    // Add the mesh to the scene
    this.scene.add(this.mesh);
  }
  
  createDiceMaterials() {
    const materials = [];
    const dotConfigs = [
      // Face 1: One dot in center
      [{ x: 0, y: 0 }],
      // Face 2: Two dots diagonal
      [{ x: -0.3, y: 0.3 }, { x: 0.3, y: -0.3 }],
      // Face 3: Three dots diagonal
      [{ x: -0.3, y: 0.3 }, { x: 0, y: 0 }, { x: 0.3, y: -0.3 }],
      // Face 4: Four dots in corners
      [{ x: -0.3, y: 0.3 }, { x: 0.3, y: 0.3 }, { x: -0.3, y: -0.3 }, { x: 0.3, y: -0.3 }],
      // Face 5: Five dots (four corners + center)
      [{ x: -0.3, y: 0.3 }, { x: 0.3, y: 0.3 }, { x: 0, y: 0 }, { x: -0.3, y: -0.3 }, { x: 0.3, y: -0.3 }],
      // Face 6: Six dots (two columns)
      [{ x: -0.3, y: 0.3 }, { x: -0.3, y: 0 }, { x: -0.3, y: -0.3 }, { x: 0.3, y: 0.3 }, { x: 0.3, y: 0 }, { x: 0.3, y: -0.3 }]
    ];
    
    for (let i = 0; i < 6; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext('2d');
      
      // Background
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, 256, 256);
      
      // Border
      context.strokeStyle = '#000000';
      context.lineWidth = 4;
      context.strokeRect(0, 0, 256, 256);
      
      // Dots
      context.fillStyle = '#000000';
      const dots = dotConfigs[i];
      dots.forEach(dot => {
        const x = (dot.x + 0.5) * 256;
        const y = (-dot.y + 0.5) * 256;
        context.beginPath();
        context.arc(x, y, 20, 0, Math.PI * 2);
        context.fill();
      });
      
      const texture = new THREE.CanvasTexture(canvas);
      materials.push(new THREE.MeshLambertMaterial({ map: texture }));
    }
    
    return materials;
  }
  
  createPhysicsBody(position) {
    // Create a box shape for physics
    const shape = new CANNON.Box(new CANNON.Vec3(this.size / 2, this.size / 2, this.size / 2));
    
    // Create the physics body
    this.body = new CANNON.Body({
      mass: 1, // Give it mass so it falls
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      material: new CANNON.Material({
        friction: 0.4,
        restitution: 0.3 // Bounce factor
      })
    });
    
    // Add some initial random rotation
    this.body.angularVelocity.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
    
    // Add the body to the physics world
    this.world.addBody(this.body);
  }
  
  // Roll the dice by applying random forces
  roll() {
    // Reset position and rotation
    this.body.position.set(
      (Math.random() - 0.5) * 4,
      5 + Math.random() * 2,
      (Math.random() - 0.5) * 4
    );
    
    // Apply random velocity
    this.body.velocity.set(
      (Math.random() - 0.5) * 10,
      Math.random() * 5,
      (Math.random() - 0.5) * 10
    );
    
    // Apply random angular velocity
    this.body.angularVelocity.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20
    );
  }
  
  // Update the visual position to match physics
  update() {
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  }
  
  // Get the current face value (1-6) based on which face is up
  getValue() {
    const up = new THREE.Vector3(0, 1, 0);
    const faces = [
      new THREE.Vector3(1, 0, 0),   // Face 1 (right)
      new THREE.Vector3(-1, 0, 0),  // Face 2 (left)
      new THREE.Vector3(0, 1, 0),   // Face 3 (top)
      new THREE.Vector3(0, -1, 0),  // Face 4 (bottom)
      new THREE.Vector3(0, 0, 1),   // Face 5 (front)
      new THREE.Vector3(0, 0, -1)   // Face 6 (back)
    ];
    
    let maxDot = -1;
    let faceValue = 1;
    
    faces.forEach((face, index) => {
      const worldFace = face.clone().applyQuaternion(this.mesh.quaternion);
      const dot = worldFace.dot(up);
      if (dot > maxDot) {
        maxDot = dot;
        faceValue = index + 1;
      }
    });
    
    return faceValue;
  }
  
  // Check if the dice has stopped moving
  isAtRest() {
    const velocityThreshold = 0.1;
    const angularThreshold = 0.1;
    
    return this.body.velocity.length() < velocityThreshold && 
           this.body.angularVelocity.length() < angularThreshold;
  }
  
  // Remove the dice from the scene and physics world
  destroy() {
    this.scene.remove(this.mesh);
    this.world.removeBody(this.body);
  }
}

// Set up the scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Set up the renderer with responsive settings
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  powerPreference: "high-performance" // Better for mobile
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize for high-DPI displays
renderer.setAnimationLoop(animate);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Set up physics world
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0) // Earth gravity
});

// Create dynamic ground that covers entire viewport
let ground;
let groundGeometry;

function createGround() {
  // Remove existing ground if it exists
  if (ground) {
    scene.remove(ground);
    if (groundGeometry) {
      groundGeometry.dispose();
    }
  }
  
  // Calculate viewport boundaries to match invisible walls calculation
  const cameraHeight = 15; // Camera Y position
  const fov = camera.fov * (Math.PI / 180); // Convert to radians
  const aspect = camera.aspect;
  
  // Calculate visible area at ground level (y=0)
  const visibleHeight = 2 * Math.tan(fov / 2) * cameraHeight;
  const visibleWidth = visibleHeight * aspect;
  
  // Make ground larger than viewport to ensure full coverage
  const groundWidth = visibleWidth * 1.2; // 20% larger for safety margin
  const groundHeight = visibleHeight * 1.2;
  
  // Create new ground geometry
  groundGeometry = new THREE.PlaneGeometry(groundWidth, groundHeight);
  const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
  ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}

// Create initial ground
createGround();

// Physics ground (this stays the same - infinite plane)
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(groundShape);
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);


// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Position camera for bird's eye view
camera.position.set(0, 15, 0); // High above the scene
camera.lookAt(0, 0, 0); // Looking down at the center

// Keep track of wall bodies for removal during resize
let wallBodies = [];

// Function to remove existing walls
function removeWalls() {
  wallBodies.forEach(body => {
    world.removeBody(body);
  });
  wallBodies = [];
}

// Updated function to create invisible walls with tracking
function createInvisibleWalls() {
  // Remove existing walls first
  removeWalls();
  
  // Calculate viewport boundaries based on camera position and FOV
  const cameraHeight = 15; // Camera Y position
  const fov = camera.fov * (Math.PI / 180); // Convert to radians
  const aspect = camera.aspect;
  
  // Calculate visible area at ground level (y=0)
  const visibleHeight = 2 * Math.tan(fov / 2) * cameraHeight;
  const visibleWidth = visibleHeight * aspect;
  
  // Make walls slightly smaller than visible area to keep dice fully in view
  const wallMargin = 1; // Small margin to ensure dice stay visible
  const halfWidth = (visibleWidth / 2) - wallMargin;
  const halfHeight = (visibleHeight / 2) - wallMargin;
  const wallHeight = 5; // Height of invisible walls
  
  // Wall material with some bounce
  const wallMaterial = new CANNON.Material({
    friction: 0.3,
    restitution: 0.6 // More bouncy than ground
  });
  
  // Create 4 walls: left, right, front, back
  const walls = [
    // Left wall
    { position: [-halfWidth, wallHeight/2, 0], size: [0.1, wallHeight/2, halfHeight] },
    // Right wall  
    { position: [halfWidth, wallHeight/2, 0], size: [0.1, wallHeight/2, halfHeight] },
    // Front wall
    { position: [0, wallHeight/2, -halfHeight], size: [halfWidth, wallHeight/2, 0.1] },
    // Back wall
    { position: [0, wallHeight/2, halfHeight], size: [halfWidth, wallHeight/2, 0.1] }
  ];
  
  walls.forEach(wall => {
    const wallShape = new CANNON.Box(new CANNON.Vec3(wall.size[0], wall.size[1], wall.size[2]));
    const wallBody = new CANNON.Body({ 
      mass: 0, // Static walls
      material: wallMaterial 
    });
    wallBody.addShape(wallShape);
    wallBody.position.set(wall.position[0], wall.position[1], wall.position[2]);
    world.addBody(wallBody);
    wallBodies.push(wallBody); // Track for later removal
  });
}

// Create the initial invisible walls
createInvisibleWalls();

// Responsive resize handler
function handleResize() {
  // Update camera aspect ratio
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  
  // Update renderer size
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // Recreate ground to cover new viewport size
  createGround();
  
  // Recreate walls with new viewport dimensions
  createInvisibleWalls();
}

// Add resize event listener
window.addEventListener('resize', handleResize);

// Handle orientation changes on mobile
window.addEventListener('orientationchange', () => {
  setTimeout(handleResize, 100); // Small delay to ensure proper orientation change
});

// Create dice
const dice = [];
for (let i = 0; i < 6; i++) {
  const die = new Dice(scene, world, { 
    x: (i - 2.5) * 2, 
    y: 5 + i * 0.5, 
    z: 0 
  });
  dice.push(die);
}

// Add touch and click events to roll dice (mobile-friendly)
function rollDice() {
  dice.forEach(die => die.roll());
}

// Support both touch and mouse events
document.addEventListener('click', rollDice);
document.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent double-tap zoom on mobile
  rollDice();
}, { passive: false });



// Add responsive text display for dice values
const infoDiv = document.createElement('div');
infoDiv.className = 'dice-info';
infoDiv.innerHTML = 'Tap to roll dice!';
document.body.appendChild(infoDiv);

function animate() {
  // Step the physics simulation
  world.step(1/60);
  
  // Update all dice
  dice.forEach(die => die.update());
  
  // Check if all dice are at rest and show values
  const allAtRest = dice.every(die => die.isAtRest());
  if (allAtRest) {
    const values = dice.map(die => die.getValue());
    infoDiv.innerHTML = `Dice values: ${values.join(', ')} | Total: ${values.reduce((a, b) => a + b, 0)}<br>Click to roll again!`;
  } else {
    infoDiv.innerHTML = 'Dice rolling...';
  }
  
  // Render the scene
  renderer.render(scene, camera);
}