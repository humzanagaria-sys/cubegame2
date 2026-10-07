import { NetworkManager } from './network.js';
import { buildEnvironment, setupLighting } from './world.js';
import { Boss } from './entities.js';

class GameEngine {
    constructor() {
        this.config = { playerSpeed: 0.15, projectileSpeed: 0.8 };
        this.player = { hp: 100, x: 0, z: 20, lastNetworkUpdate: 0 };
        this.keys = { w: false, a: false, s: false, d: false };
        this.mouse = { x: 0, y: 0 };
        this.projectiles = [];
        this.bossProjectiles = [];
        this.remotePlayers = {};
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.boss = null;
        this.network = new NetworkManager(this);
        this.setupMenuHooks();
    }
    setupMenuHooks() {
        document.getElementById('btn-solo').addEventListener('click', () => this.startGame(false));
        document.getElementById('btn-host').addEventListener('click', () => {
            document.getElementById('btn-host').innerText = "Generating Room ID...";
            this.network.initHost(
                (id) => document.getElementById('host-id-display').innerHTML = `Room ID:<br><b style="color:white;">${id}</b>`,
                () => this.startGame(true)
            );
        });
        document.getElementById('btn-join').addEventListener('click', () => {
            const id = document.getElementById('join-id-input').value.trim();
            if (id) this.network.initJoin(id, () => this.startGame(true));
        });
    }
    startGame(isMultiplayer) {
        document.getElementById('menu-container').style.display = 'none';
        document.getElementById('game-ui').style.display = 'block';
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('instructions').style.display = 'block';
        if (isMultiplayer) {
            document.getElementById('lobby-status').innerText = this.network.isHost ? "Mode: Host" : "Mode: Guest";
        }
        this.initEngine();
    }
    initEngine() {
        // Explicitly map THREE framework scope across module boundaries
        window.THREE = window.THREE || THREE;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020208);
        this.scene.fog = new THREE.FogExp2(0x020208, 0.015);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        buildEnvironment(this.scene);
        setupLighting(this.scene);
        this.boss = new Boss(this.scene);
        
        document.getElementById('boss-hp-container').style.display = 'block';
        window.addEventListener('resize', () => this.onWindowResize());
        document.addEventListener('keydown', (e) => this.handleKeys(e, true));
        document.addEventListener('keyup', (e) => this.handleKeys(e, false));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('click', () => {
            if (document.pointerLockElement !== document.body) document.body.requestPointerLock();
            else this.fireLaser();
        });
        this.animate(0);
    }
    handleKeys(e, status) {
        if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) this.keys[e.key.toLowerCase()] = status;
    }
    handleMouseMove(e) {
        if (document.pointerLockElement === document.body) {
            this.mouse.x += e.movementX * 0.002;
            this.mouse.y -= e.movementY * 0.002;
            this.mouse.y = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.mouse.y));
        }
    }
    updateMovement() {
        let f = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mouse.x);
        let r = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mouse.x);
        let move = new THREE.Vector3();
        if (this.keys.w) move.add(f);
        if (this.keys.s) move.add(f.clone().negate());
        if (this.keys.d) move.add(r);
        if (this.keys.a) move.add(r.clone().negate());
        move.normalize().multiplyScalar(this.config.playerSpeed);
        this.player.x = Math.max(-95, Math.min(95, this.player.x + move.x));
        this.player.z = Math.max(-95, Math.min(95, this.player.z + move.z));
        this.camera.position.set(this.player.x, 3, this.player.z);
        let look = new THREE.Vector3(
            this.player.x + Math.sin(this.mouse.x) * Math.cos(this.mouse.y),
            3 + Math.sin(this.mouse.y),
            this.player.z - Math.cos(this.mouse.x) * Math.cos(this.mouse.y)
        );
        this.camera.lookAt(look);
        let now = performance.now();
        if (now - this.player.lastNetworkUpdate > 30) {
            this.network.sendMovement(this.player.x, this.player.z);
            this.player.lastNetworkUpdate = now;
        }
    }
    fireLaser() {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        const origin = new THREE.Vector3(this.player.x, 2.5, this.player.z);
        this.spawnLaserMesh(origin, dir, 0x00ffcc, this.projectiles);
        this.network.sendLaser(origin, dir);
    }
    spawnRemoteLaser(orig, dir) {
        this.spawnLaserMesh(new THREE.Vector3(orig.x, orig.y, orig.z), new THREE.Vector3(dir.x, dir.y, dir.z), 0xffaa00, this.projectiles);
    }
    spawnLaserMesh(origin, dir, color, arr) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color }));
        m.position.copy(origin);
        this.scene.add(m);
        arr.push({ mesh: m, dir });
    }
    createBossProjectile(pos, dir) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2), new THREE.MeshBasicMaterial({ color: 0xff0055 }));
        m.position.copy(pos);
        m.lookAt(pos.clone().add(dir));
        this.scene.add(m);
        this.bossProjectiles.push({ mesh: m, dir });
    }
    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.mesh.position.addScaledVector(p.dir, this.config.projectileSpeed);
            if (p.mesh.position.distanceTo(this.camera.position) > 150) {
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }
            if (this.boss?.mesh && this.boss.hp > 0) {
                if (p.mesh.position.distanceTo(this.boss.mesh.position) < 7) {
                    if (!this.network.isMultiplayer || this.network.isHost) {
                        this.boss.takeDamage(15, () => {});
                    }
                    this.scene.remove(p.mesh);
                    this.projectiles.splice(i, 1);
                }
            }
        }
        for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
            let bp = this.bossProjectiles[i];
            bp.mesh.position.addScaledVector(bp.dir, 0.4 + (this.boss.stage * 0.05));
            if (bp.mesh.position.distanceTo(new THREE.Vector3(this.player.x, 2, this.player.z)) < 2.0) {
                this.player.hp -= 5;
                document.getElementById('player-hp-fill').style.width = `${Math.max(0, this.player.hp)}%`;
                this.scene.remove(bp.mesh);
                this.bossProjectiles.splice(i, 1);
                if (this.player.hp <= 0) {
                    alert("Simulation terminated. Refresh to try again.");
                    window.location.reload();
                }
                continue;
            }
            if (bp.mesh.position.length() > 150) {
                this.scene.remove(bp.mesh);
                this.bossProjectiles.splice(i, 1);
            }
        }
    }
    updateRemotePlayerPosition(id, x, z) {
        if (!this.remotePlayers[id]) {
            const m = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.5, 4), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
            m.position.set(x, 1.5, z);
            this.scene.add(m);
            this.remotePlayers[id] = m;
        } else {
            this.remotePlayers[id].position.set(x, 1.5, z);
        }
    }
    syncBossData(data) {
        if (!this.boss) return;
        this.boss.hp = data.hp;
        this.boss.stage = data.stage;
        this.boss.mesh.position.set(data.bx, data.by, data.bz);
        document.getElementById('stage-val').innerText = data.stage;
        document.getElementById('boss-hp-fill').style.width = `${(data.hp / (1000 + (data.stage * 200 - 200))) * 100}%`;
    }
    onWindowResize() {
        if (!this.camera) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    animate(timestamp) {
        requestAnimationFrame((t) => this.animate(t));
        this.updateMovement();
        if (this.boss) {
            this.boss.update(timestamp, this.network.isHost, this.network.isMultiplayer, (pos, dir) => this.createBossProjectile(pos, dir));
            document.getElementById('boss-hp-fill').style.width = `${(this.boss.hp / (1000 + (this.boss.stage * 200 - 200))) * 100}%`;
            document.getElementById('stage-val').innerText = this.boss.stage;
            if (this.network.isMultiplayer && this.network.isHost) {
                this.network.sendBoss({
                    hp: this.boss.hp,
                    stage: this.boss.stage,
                    bx: this.boss.mesh.position.x,
                    by: this.boss.mesh.position.y,
                    bz: this.boss.mesh.position.z
                });
            }
        }
        this.updateProjectiles();
        this.renderer.render(this.scene, this.camera);
    }
}
