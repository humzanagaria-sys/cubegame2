export function buildEnvironment(scene) {
    const floorGeo = new THREE.PlaneGeometry(200, 200, 50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x111122,
        roughness: 0.2,
        metalness: 0.8
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(200, 50, 0x00ffcc, 0x223344);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    const pillarGeo = new THREE.BoxGeometry(4, 30, 4);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.5 });
    for (let i = 0; i < 12; i++) {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        let angle = (i / 12) * Math.PI * 2;
        pillar.position.set(Math.cos(angle) * 60, 15, Math.sin(angle) * 60);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);
    }
}

export function setupLighting(scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(40, 100, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const neonBlue = new THREE.PointLight(0x00ffcc, 2, 50);
    neonBlue.position.set(-20, 5, -20);
    scene.add(neonBlue);

    const neonPink = new THREE.PointLight(0xff0055, 2, 50);
    neonPink.position.set(20, 5, -20);
    scene.add(neonPink);
}
