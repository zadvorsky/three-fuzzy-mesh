const colors = {
  turquoise: 0x47debd,
  darkPurple: 0x2e044e,
  purple: 0x7821ec,
  yellow: 0xfff95d,
  white: 0xffffff,
  black: 0x000000
};

const root = new THREERoot({
  createCameraControls: true,
  zNear: 0.01,
  zFar: 1000,
  antialias: true,
});

root.renderer.shadowMap.enabled = true;
root.renderer.setClearColor(colors.darkPurple);
root.camera.position.set(-10, 0, 20);

const light = new THREE.DirectionalLight(colors.turquoise);
light.position.set(0.125, 1, 0);
root.add(light);

const light2 = new THREE.DirectionalLight(colors.yellow);
light2.position.set(-0.125, -1, 0);
root.add(light2);

root.add(new THREE.AmbientLight(colors.purple));

new THREE.JSONLoader().load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/304639/plus.json', (geometry) => {
  // test shapes, try different ones :D
  // model = new THREE.SphereGeometry(1, 16, 16);
  // model = new THREE.PlaneGeometry(40, 10, 200, 40);
  // model = new THREE.CylinderGeometry(2, 2, 8, 128, 64, true);
  // model = new THREE.TorusGeometry(8, 1, 128, 256);
  // model = new THREE.TorusKnotGeometry(2, 0.1, 64, 64, 3, 5);

  const fuzzy = new FuzzyMesh({
    geometry: geometry,
    // directions: model.vertices,
    config: {
      hairLength: 2,
      hairRadialSegments: 4,
      hairRadiusTop: 0.0,
      hairRadiusBase: 0.1,
    },
    materialUniformValues: {
      roughness: 1.0
    }
  });
  root.add(fuzzy);
  root.addUpdateCallback(() => {
    fuzzy.update();
  });

  const axes = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];

  const proxy = {
    position: new THREE.Vector3(),
    angle: 0,
  };

  const tl = new TimelineMax({
    repeat: -1,
    delay: 1,
    repeatDelay: 1,
    onRepeat: () => {
      fuzzy.setRotationAxis(BAS.Utils.randomAxis());
      // fuzzy.setRotationAxis(axes[Math.random() * 3 | 0]);
    },
    onUpdate: () => {
      fuzzy.setPosition(proxy.position);
      fuzzy.setRotationAngle(proxy.angle);
    }
  });

  tl.to(proxy.position, 0.5, {y: 8, ease: Power2.easeOut});
  tl.to(proxy.position, 0.5, {y: 0, ease: Power2.easeIn});
  tl.to(proxy.position, 0.1, {y: -2, ease: Power2.easeOut});
  tl.to(proxy.position, 0.5, {y: 0, ease: Power2.easeOut});
  tl.fromTo(proxy, 1.0, {angle: 0}, {angle: Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1), ease: Power1.easeInOut}, 0);
});
