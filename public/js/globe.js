 const container = document.getElementById("globe-container");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 2.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load("./assets/globe.png", function (texture) {
      const geometry = new THREE.SphereGeometry(1, 64, 64);
      const material = new THREE.MeshStandardMaterial({ map: texture });
      const globe = new THREE.Mesh(geometry, material);
      scene.add(globe);

      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false;   // no zoom
      controls.enablePan = false;    // no pan
      controls.rotateSpeed = 0.6;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      let autoRotate = true;
      let lastInteractionTime = Date.now();

      controls.addEventListener('start', () => {
        autoRotate = false; 
      });

      controls.addEventListener('end', () => {
        lastInteractionTime = Date.now();
      });

      function animate() {
        requestAnimationFrame(animate);
        if (autoRotate) globe.rotation.y += 0.002; 
        controls.update();
        renderer.render(scene, camera);

        if (!autoRotate && Date.now() - lastInteractionTime > 3000) {
          autoRotate = true;
        }
      }
      animate();
    });