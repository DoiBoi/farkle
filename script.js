import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class Dice {
    constructor(scene, world, position = { x: 0, y: 5, z: 0 }) {
        this.scene = scene;
        this.world = world;
        this.size = 1;
        this.isSelected = false; // Track selection state
        this.originalMaterial = null; // Store original materials
        this.selectionOutline = null; // Selection outline mesh

        // Drag and throw mechanics
        this.isDragging = false;
        this.isFloating = true; // Start in floating state
        this.dragStartPos = new THREE.Vector3();
        this.dragCurrentPos = new THREE.Vector3();
        this.floatOffset = Math.random() * Math.PI * 2; // Random float animation offset
        this.baseHeight = position.y; // Store base floating height

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
        this.originalMaterial = materials; // Store original materials

        // Create the mesh with the materials
        this.mesh = new THREE.Mesh(geometry, materials);
        this.mesh.userData = { dice: this }; // Reference back to this dice instance
        this.mesh.name = `dice_${Math.random()}`; // Add unique identifier

        // Add edges for better visibility
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        wireframe.userData = { dice: this }; // Also add reference to wireframe
        this.mesh.add(wireframe);

        // Create selection outline (initially hidden)
        const outlineGeometry = new THREE.BoxGeometry(this.size * 1.1, this.size * 1.1, this.size * 1.1);
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        this.selectionOutline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        this.selectionOutline.visible = false;
        this.selectionOutline.userData = { dice: this }; // Add reference to outline too
        this.mesh.add(this.selectionOutline);

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

        // Create the physics body - always give it some mass but disable gravity when floating
        this.body = new CANNON.Body({
            mass: 1, // Always have mass for proper physics
            shape: shape,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            material: new CANNON.Material({
                friction: 0.4,
                restitution: 0.3 // Bounce factor
            })
        });

        // For floating state, we'll control movement manually and disable gravity effects
        if (this.isFloating) {
            this.body.type = CANNON.Body.KINEMATIC; // Kinematic bodies ignore gravity but can be moved
        }

        // Add some initial gentle rotation for floating effect
        if (this.isFloating) {
            this.body.angularVelocity.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
        }

        // Add the body to the physics world
        this.world.addBody(this.body);
    }

    // Roll the dice by applying random forces (only if not selected)
    roll() {
        if (this.isSelected) {
            return; // Don't roll selected dice
        }

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
    update(time) {
        // Update floating animation if in floating state and NOT being dragged
        if (this.isFloating && !this.isDragging) {
            this.updateFloating(time);
        }

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

    // Toggle selection state
    toggleSelection() {
        this.isSelected = !this.isSelected;
        this.updateSelectionVisual();
    }

    // Update visual feedback for selection
    updateSelectionVisual() {
        if (this.isSelected) {
            // Show selection outline
            this.selectionOutline.visible = true;
            // Slightly tint the dice
            this.mesh.material.forEach(material => {
                if (material.emissive) {
                    material.emissive.setHex(0x002200); // Green tint
                }
            });
        } else {
            // Hide selection outline
            this.selectionOutline.visible = false;
            // Remove tint
            this.mesh.material.forEach(material => {
                if (material.emissive) {
                    material.emissive.setHex(0x000000); // No tint
                }
            });
        }
    }

    // Clear selection
    clearSelection() {
        this.isSelected = false;
        this.updateSelectionVisual();
    }

    // Start gathering the dice to mouse position
    startGather() {
        if (this.isFloating) {
            this.isDragging = true;

            // Visual feedback for gathering
            this.mesh.material.forEach(material => {
                if (material.emissive) {
                    material.emissive.setHex(0x002200); // Green tint
                }
            });
        }
    }

    // Move dice toward target position (mouse) with collision avoidance
    gatherToPosition(targetPos, deltaTime, allGatheringDice) {
        if (this.isDragging && this.isFloating) {
            const currentPos = this.body.position;

            // Calculate base direction to target
            const targetCannon = new CANNON.Vec3(targetPos.x, targetPos.y, targetPos.z);

            // Create stable circular formation around target
            const gatheringIndex = allGatheringDice.indexOf(this);
            const totalGathering = allGatheringDice.length;
            const angle = (gatheringIndex / totalGathering) * Math.PI * 2;
            const radius = Math.max(0.8, totalGathering * 0.3); // Dynamic radius based on dice count

            // Calculate position in circle formation
            const circleOffset = new CANNON.Vec3(
                Math.cos(angle) * radius,
                0, // Keep Y offset at 0 to prevent vertical drift
                Math.sin(angle) * radius
            );

            const targetWithOffset = new CANNON.Vec3();
            targetCannon.vadd(circleOffset, targetWithOffset);

            // Calculate direction to target with offset
            const direction = new CANNON.Vec3();
            targetWithOffset.vsub(currentPos, direction);

            // Calculate new position with smooth movement
            const speed = 6; // Slightly increased speed for better responsiveness
            const moveDistance = Math.min(direction.length(), speed * deltaTime);

            if (direction.length() > 0.4) { // Reduced threshold to ensure dice reach the target
                direction.normalize();
                direction.scale(moveDistance);

                // Apply movement with reduced damping
                const dampingFactor = 0.7; // Allow more movement per frame
                const newPos = new CANNON.Vec3(
                    currentPos.x + direction.x * dampingFactor,
                    currentPos.y + direction.y * dampingFactor,
                    currentPos.z + direction.z * dampingFactor
                );
                this.body.position.copy(newPos);
            }
        }
    }

    // End gathering and throw the dice
    throwDice(throwVelocity) {
        if (this.isDragging && this.isFloating) {
            this.isDragging = false;
            this.isFloating = false;

            // Remove gathering visual effect
            this.mesh.material.forEach(material => {
                if (material.emissive) {
                    material.emissive.setHex(0x000000);
                }
            });

            // Change from kinematic to dynamic body for physics
            this.body.type = CANNON.Body.DYNAMIC;

            // Apply throw velocity with some randomness
            const randomness = new CANNON.Vec3(
                (Math.random() - 0.5) * 3,
                Math.random() * 2,
                (Math.random() - 0.5) * 3
            );

            this.body.velocity.set(
                throwVelocity.x + randomness.x,
                Math.max(throwVelocity.y + randomness.y, 3), // Ensure upward force
                throwVelocity.z + randomness.z
            );

            // Add random spin
            this.body.angularVelocity.set(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );
        }
    }

    // Update floating animation
    updateFloating(time) {
        if (this.isFloating && !this.isDragging) {
            // Calculate gentle floating motion for Y position only
            const floatY = this.baseHeight + Math.sin(time * 0.002 + this.floatOffset) * 0.3;

            // Only update Y position, leave X and Z unchanged
            this.body.position.y = floatY;

            // Gentle rotation
            this.body.angularVelocity.set(
                Math.sin(time * 0.001) * 0.5,
                Math.cos(time * 0.0008) * 0.5,
                Math.sin(time * 0.0012) * 0.5
            );
        }
    }

    // Reset dice to floating state
    resetToFloating(position) {
        this.isFloating = true;
        this.isDragging = false;
        this.isSelected = false;
        this.updateSelectionVisual();

        // Reset to kinematic body for floating
        this.body.type = CANNON.Body.KINEMATIC;
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);

        // Reset position and store base position for floating
        this.body.position.set(position.x, position.y, position.z);
        this.baseHeight = position.y;

        // Reset visual effects
        this.mesh.scale.set(1, 1, 1);
        this.mesh.material.forEach(material => {
            if (material.opacity !== undefined) {
                material.opacity = 1;
            }
            if (material.emissive) {
                material.emissive.setHex(0x000000); // Clear any emissive tint
            }
        });
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
        { position: [-halfWidth, wallHeight / 2, 0], size: [0.1, wallHeight / 2, halfHeight] },
        // Right wall  
        { position: [halfWidth, wallHeight / 2, 0], size: [0.1, wallHeight / 2, halfHeight] },
        // Front wall
        { position: [0, wallHeight / 2, -halfHeight], size: [halfWidth, wallHeight / 2, 0.1] },
        // Back wall
        { position: [0, wallHeight / 2, halfHeight], size: [halfWidth, wallHeight / 2, 0.1] }
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

// Set up interaction for gather and flick mechanics
const mouse = new THREE.Vector2();
let isGathering = false;
let gatherStartTime = 0;
let mouseStartPos = new THREE.Vector2();
let mouseCurrentPos = new THREE.Vector2();
let lastUpdateTime = 0;

// Convert screen coordinates to world position at dice height
function screenToWorldPosition(screenX, screenY) {
    // Convert screen to normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;

    // Create raycaster from camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    // Calculate intersection with a plane at dice floating height
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -5); // Plane at y=5
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    return intersection;
}

// Handle mouse/touch down - start gathering or select dice
function handleGatherStart(event) {
    event.preventDefault();

    let clientX, clientY;
    if (event.type === 'touchstart') {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    // Check if we're clicking on a thrown dice first (for selection)
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    // Check for intersections with thrown dice first
    const thrownDice = dice.filter(die => !die.isFloating && die.isAtRest());
    const thrownDiceObjects = thrownDice.map(die => die.mesh);
    const intersects = raycaster.intersectObjects(thrownDiceObjects, true);

    if (intersects.length > 0 && thrownDice.length > 0) {
        // Handle dice selection for thrown dice
        let clickedDice = null;

        for (let intersect of intersects) {
            let object = intersect.object;

            if (object.userData && object.userData.dice) {
                clickedDice = object.userData.dice;
                break;
            }

            if (object.parent && object.parent.userData && object.parent.userData.dice) {
                clickedDice = object.parent.userData.dice;
                break;
            }
        }

        if (clickedDice && clickedDice.isAtRest()) {
            clickedDice.toggleSelection();
            updateInfoDisplay();
            return; // Don't start gathering if we selected a dice
        }
    }

    // If no thrown dice selected, start gathering floating dice
    const floatingDice = dice.filter(die => die.isFloating);
    if (floatingDice.length === 0) return;

    isGathering = true;
    gatherStartTime = Date.now();
    mouseStartPos.set(clientX, clientY);
    mouseCurrentPos.set(clientX, clientY);

    // Start gathering all floating dice
    floatingDice.forEach(die => die.startGather());
}

// Handle mouse/touch move - update gather position
function handleGatherMove(event) {
    if (!isGathering) return;

    event.preventDefault();

    let clientX, clientY;
    if (event.type === 'touchmove') {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    // Smooth the updates to mouseCurrentPos using damping
    const dampingFactor = 0.2; // Adjust this value for smoother or faster updates
    mouseCurrentPos.lerp(new THREE.Vector2(clientX, clientY), dampingFactor);
}

// Handle mouse/touch up - flick and throw
function handleFlick(event) {
    if (!isGathering) return;

    event.preventDefault();

    const gatherDuration = Date.now() - gatherStartTime;
    const mouseDelta = new THREE.Vector2().subVectors(mouseCurrentPos, mouseStartPos);

    // Calculate flick velocity based on mouse movement and time
    const flickSpeed = mouseDelta.length() / Math.max(gatherDuration, 100); // Prevent division by zero
    const flickDirection = mouseDelta.normalize();

    // Convert to 3D throw velocity
    const throwForce = Math.min(flickSpeed * 0.3, 15); // Cap the force
    const throwVelocity = new CANNON.Vec3(
        flickDirection.x * throwForce,
        Math.max(throwForce * 0.5, 5), // Always have some upward force
        (Math.random() - 0.5) * throwForce * 0.5 // Add some Z variation
    );

    // Throw all gathering dice
    const gatheringDice = dice.filter(die => die.isDragging);
    gatheringDice.forEach(die => die.throwDice(throwVelocity));

    isGathering = false;
}

// Update gathering behavior in animation loop
function updateGathering(currentTime) {
    if (!isGathering) return;

    const deltaTime = (currentTime - lastUpdateTime) / 1000; // Convert to seconds

    // Get world position where mouse is pointing
    const targetWorldPos = screenToWorldPosition(mouseCurrentPos.x, mouseCurrentPos.y);

    // Get all gathering dice for spacing calculations
    const gatheringDice = dice.filter(die => die.isDragging);

    // Move all gathering dice toward the target position with spacing
    gatheringDice.forEach(die => {
        die.gatherToPosition(targetWorldPos, deltaTime, gatheringDice);
    });
}

// Add event listeners
document.addEventListener('mousedown', handleGatherStart);
document.addEventListener('mousemove', handleGatherMove);
document.addEventListener('mouseup', handleFlick);
document.addEventListener('touchstart', handleGatherStart, { passive: false });
document.addEventListener('touchmove', handleGatherMove, { passive: false });
document.addEventListener('touchend', handleFlick, { passive: false });



// Add responsive text display for dice values and controls
const infoDiv = document.createElement('div');
infoDiv.className = 'dice-info';
infoDiv.innerHTML = 'Drag dice to throw them!';
document.body.appendChild(infoDiv);

// Add control buttons
const controlsDiv = document.createElement('div');
controlsDiv.style.position = 'fixed';
controlsDiv.style.bottom = '20px';
controlsDiv.style.left = '50%';
controlsDiv.style.transform = 'translateX(-50%)';
controlsDiv.style.display = 'flex';
controlsDiv.style.gap = '10px';
controlsDiv.style.zIndex = '1000';
document.body.appendChild(controlsDiv);

// Reset to floating button
const resetButton = document.createElement('button');
resetButton.textContent = 'Roll Unselected';
resetButton.style.padding = '10px 20px';
resetButton.style.fontSize = '16px';
resetButton.style.backgroundColor = '#2196F3';
resetButton.style.color = 'white';
resetButton.style.border = 'none';
resetButton.style.borderRadius = '5px';
resetButton.style.cursor = 'pointer';
resetButton.addEventListener('click', resetAllDiceToFloating);
controlsDiv.appendChild(resetButton);

// Reset ALL dice button (for starting completely over)
const resetAllButton = document.createElement('button');
resetAllButton.textContent = 'Reset All';
resetAllButton.style.padding = '10px 20px';
resetAllButton.style.fontSize = '16px';
resetAllButton.style.backgroundColor = '#f44336';
resetAllButton.style.color = 'white';
resetAllButton.style.border = 'none';
resetAllButton.style.borderRadius = '5px';
resetAllButton.style.cursor = 'pointer';
resetAllButton.addEventListener('click', resetAllDiceCompletely);
controlsDiv.appendChild(resetAllButton);

// Throw all dice button
const throwAllButton = document.createElement('button');
throwAllButton.textContent = 'Throw All';
throwAllButton.style.padding = '10px 20px';
throwAllButton.style.fontSize = '16px';
throwAllButton.style.backgroundColor = '#4CAF50';
throwAllButton.style.color = 'white';
throwAllButton.style.border = 'none';
throwAllButton.style.borderRadius = '5px';
throwAllButton.style.cursor = 'pointer';
throwAllButton.addEventListener('click', throwAllDice);
controlsDiv.appendChild(throwAllButton);

// Reset only unselected dice to floating state (keep selected dice on table)
function resetAllDiceToFloating() {
    dice.forEach((die, index) => {
        // Only reset dice that are NOT selected
        if (!die.isSelected) {
            die.resetToFloating({
                x: (index - 2.5) * 2,
                y: 5 + index * 0.5,
                z: 0
            });
        }
    });
    updateInfoDisplay();
}

// Reset ALL dice to floating state (including selected ones)
function resetAllDiceCompletely() {
    dice.forEach((die, index) => {
        die.clearSelection(); // Clear selection first
        die.resetToFloating({
            x: (index - 2.5) * 2,
            y: 5 + index * 0.5,
            z: 0
        });
    });
    updateInfoDisplay();
}

// Throw all floating dice with random velocities
function throwAllDice() {
    dice.forEach(die => {
        // Only throw dice that are floating (not selected dice on table)
        if (die.isFloating) {
            const randomVelocity = new CANNON.Vec3(
                (Math.random() - 0.5) * 10,
                Math.random() * 5 + 3,
                (Math.random() - 0.5) * 10
            );
            die.throwDice(randomVelocity);
        }
    });
}

// Update info display function
function updateInfoDisplay() {
    const floatingDice = dice.filter(die => die.isFloating);
    const gatheringDice = dice.filter(die => die.isDragging);
    const thrownDice = dice.filter(die => !die.isFloating && !die.isDragging);
    const atRestDice = thrownDice.filter(die => die.isAtRest());
    const selectedDice = thrownDice.filter(die => die.isSelected);
    const unselectedThrownDice = thrownDice.filter(die => !die.isSelected);

    if (isGathering && gatheringDice.length > 0) {
        infoDiv.innerHTML = `Gathering ${gatheringDice.length} dice - release to flick!<br><small>Move mouse/finger to aim, release to throw</small>`;
    } else if (floatingDice.length > 0 && thrownDice.length === 0) {
        infoDiv.innerHTML = `${floatingDice.length} dice floating - hold to gather and flick!<br><small>Click and hold, then flick to throw</small>`;
    } else if (floatingDice.length > 0 && selectedDice.length > 0) {
        const selectedValues = selectedDice.map(die => die.getValue());
        infoDiv.innerHTML = `Kept dice: ${selectedValues.join(', ')} | ${floatingDice.length} dice ready to roll<br><small>Hold to gather floating dice and throw again</small>`;
    } else if (thrownDice.length > 0 && atRestDice.length === thrownDice.length) {
        const values = thrownDice.map(die => die.getValue());
        const selectedValues = selectedDice.map(die => die.getValue());
        const unselectedValues = unselectedThrownDice.map(die => die.getValue());
        const total = values.reduce((a, b) => a + b, 0);

        let infoText = `All dice: ${values.join(', ')} | Total: ${total}<br>`;
        if (selectedDice.length > 0) {
            infoText += `Kept: ${selectedValues.join(', ')} | `;
        }
        if (unselectedThrownDice.length > 0) {
            infoText += `Available: ${unselectedValues.join(', ')}<br>`;
        } else {
            infoText += '<br>';
        }
        infoText += `<small>Click dice to keep them • "Roll Unselected" to continue</small>`;
        infoDiv.innerHTML = infoText;
    } else {
        infoDiv.innerHTML = 'Dice rolling...';
    }
}

function animate() {
    const time = Date.now();

    // Update gathering mechanics
    updateGathering(time);

    // Step the physics simulation
    world.step(1 / 60);

    // Update all dice with time for floating animation
    dice.forEach(die => die.update(time));

    // Update info display
    updateInfoDisplay();

    // Store time for next frame
    lastUpdateTime = time;

    // Render the scene
    renderer.render(scene, camera);
}