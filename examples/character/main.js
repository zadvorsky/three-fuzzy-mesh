const colors = {
  turquoise: 0x47debd,
  darkPurple: 0x2e044e,
  purple: 0x7821ec,
  yellow: 0xfff95d,
  white: 0xffffff,
  black: 0x000000
};

// hero class

function Hero() {
  this.runningCycle = 0;
  this.mesh = new THREE.Group();
  this.body = new THREE.Group();
  this.mesh.add(this.body);


  this.torso = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(4, 48, 32),
    materialUniformValues: {
      roughness: 1.0
    },
    config: {
      hairLength: 4,
      hairRadiusBase: 0.25,
      gravity: 2,
      fuzz: 0.25,
      minForceFactor: 0.5,
      maxForceFactor: 2.0,
      centrifugalForceFactor: 4,
    }
  });
  this.torso.position.y = 8;
  this.body.add(this.torso);


  this.handR = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(1, 32, 32),
    materialUniformValues: {
      roughness: 1.0
    },
    config: {
      hairLength: 2,
      hairRadiusBase: 0.25,
      gravity: 2,
      fuzz: 0.25,
      minForceFactor: 0.5,
      maxForceFactor: 2.0
    }
  });
  this.handR.position.z = 7;
  this.handR.position.y = 8;
  this.handR.setRotationAxis(new THREE.Vector3(0, 0, 1));
  this.body.add(this.handR);


  this.handL = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(1, 32, 32),
    materialUniformValues: {
      roughness: 1.0
    },
    config: {
      hairLength: 2,
      hairRadiusBase: 0.25,
      gravity: 2,
      fuzz: 0.25,
      minForceFactor: 0.5,
      maxForceFactor: 2.0
    }
  });
  this.handL.position.y = 8;
  this.handL.position.z = - this.handR.position.z;
  this.handL.setRotationAxis(new THREE.Vector3(0, 0, 1));
  this.body.add(this.handL);


  this.head = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(4, 48, 32),
    materialUniformValues: {
      roughness: 1.0
    },
    config: {
      hairLength: 4,
      hairRadiusBase: 0.25,
      gravity: 2,
      fuzz: 0.25,
      minForceFactor: 0.5,
      maxForceFactor: 2.0
    }
  });

  this.head.position.y = 21;
  this.head.castShadow = true;
  this.head.setRotationAxis(new THREE.Vector3(1, 0, 0));
  this.body.add(this.head);


  this.legR = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(3, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    materialUniformValues: {
      roughness: 1.0,
      side: THREE.DoubleSide
    },
    config: {
      hairLength: 2,
      hairRadiusBase: 0.25,
      gravity: 2,
      fuzz: 0.25,
      minForceFactor: 0.5,
      maxForceFactor: 2.0
    }
  });
  this.legR.position.z = 6;
  this.legR.setRotationAxis(new THREE.Vector3(0, 0, 1));
  this.body.add(this.legR);


  this.legL = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(3, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    materialUniformValues: {
      roughness: 1.0,
      side: THREE.DoubleSide
    },
    config: {
      hairLength: 2,
      hairRadiusBase: 0.25,
      gravity: 2,
      fuzz: 0.25,
      minForceFactor: 0.5,
      maxForceFactor: 2.0
    }
  });
  this.legL.position.z = -6;
  this.legL.setRotationAxis(new THREE.Vector3(0, 0, 1));
  this.body.add(this.legL);
};

Hero.prototype.run = function(){
  var s = 0.1;
  var t = this.runningCycle;
  var amp = 4;

  t = t % (2*Math.PI);

  this.runningCycle += s;

  this.torso.setPosition(new THREE.Vector3(
    this.torso.position.x,
    8 - Math.cos(  t * 2 ) * amp * .2,
    this.torso.position.z
  ));

  this.head.setPosition(new THREE.Vector3(
    this.head.position.x,
    16 - Math.cos(  t * 2 ) * amp * .3,
    this.head.position.z
  ));

  this.torso.setRotationAngle(-Math.cos( t + Math.PI ) * amp * .05);

  this.handR.setPosition(new THREE.Vector3(
    -Math.cos( t ) * amp,
    this.handR.position.y,
    this.handR.position.z
  ));
  this.handR.setRotationAngle(-Math.cos(t) * Math.PI / 8);

  this.handL.setPosition(new THREE.Vector3(
    -Math.cos( t + Math.PI) * amp,
    this.handL.position.y,
    this.handL.position.z
  ));
  this.handL.setRotationAngle(-Math.cos(t + Math.PI) * Math.PI / 8);

  this.head.setRotationAngle(Math.cos(t) * amp * .02);
  // this.head.rotation.y =  Math.cos( t ) * amp * .01;

  this.legR.setPosition(new THREE.Vector3(
    Math.cos(t) * amp,
    Math.max(0, -Math.sin(t) * amp),
    6
  ));

  this.legL.setPosition(new THREE.Vector3(
    Math.cos(t + Math.PI) * amp,
    Math.max(0, -Math.sin(t + Math.PI) * amp),
    -6
  ));

  if (t > Math.PI){
    this.legR.setRotationAngle(Math.cos(t * 2 + Math.PI / 2) *  Math.PI / 4);
    this.legL.setRotationAngle(0);
  }
  else {
    this.legR.setRotationAngle(0);
    this.legL.setRotationAngle(Math.cos(t * 2 + Math.PI / 2) *  Math.PI / 4);
  }

  this.torso.update();
  this.head.update();
  this.handL.update();
  this.handR.update();
  this.legL.update();
  this.legR.update();
};

// scene stuff

const root = new THREERoot({
  createCameraControls: true,
  zNear: 0.01,
  zFar: 1000,
  antialias: true
});

root.renderer.shadowMap.enabled = true;
root.renderer.setClearColor(0xf1f1f1);
root.camera.position.set(30, 10, 30);

const light = new THREE.DirectionalLight(0xffffff, 0.5);
light.position.set(0, 1, 0);
root.add(light);

const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
light2.position.set(0, -1, 0);
root.add(light2);

// root.add(new THREE.AmbientLight(colors.purple));
// root.add(new THREE.AxisHelper(40));

const hero = new Hero();
hero.mesh.position.y = -8;
root.add(hero.mesh);

root.addUpdateCallback(() => {
  hero.run();
});
