export class Boss {
    constructor(scene) {
        this.scene = scene;
        this.maxHp = 1000;
        this.hp = this.maxHp;
        this.stage = 1;
        this.timer = 0;
        this.mesh = null;
        this.spawn();
    }
    spawn() {
        this.mesh = new THREE.Group();
        const coreMesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(6, 0),
            new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0x550011, metalness: 0.9 })
        );
        coreMesh.castShadow = true;
        this.mesh.add(coreMesh);
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(9, 0.6, 16, 100),
            new THREE.MeshStandardMaterial({ color: 0x00ffcc, metalness: 0.8 })
        );
        this.mesh.add(ring);
        this.mesh.position.set(0, 10, -30);
        this.scene.add(this.mesh);
    }
    update(time, isHost, isMultiplayer, onFireAttack) {
        if (!this.mesh || this.hp <= 0) return;
        this.mesh.children[0].rotation.y += 0.02;
        this.mesh.position.y = 10 + Math.sin(time * 0.002) * 2;
        if (isMultiplayer && !isHost) return;
        this.timer++;
        if (this.timer % 60 === 0) {
            const count = 10 + this.stage * 2;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                let dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
                onFireAttack(this.mesh.position, dir);
            }
        }
    }
    takeDamage(amount, onDefeat) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.stage++;
            this.hp = this.maxHp + (this.stage * 200);
            onDefeat();
        }
    }
}
