
// hero class, based on work by Karim Maaloul

function Hero() {
  this.runningCycle = 0;
  this.mesh = new THREE.Group();
  this.body = new THREE.Group();
  this.mesh.add(this.body);


  this.head = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(4, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
    materialUniformValues: {
      roughness: 1.0
    },
    config: {
      hairLength: 6,
      hairRadiusBase: 0.5,
      hairRadialSegments: 6,
      gravity: 2,
      fuzz: 0.25,
      minForceFactor: 0.5,
      maxForceFactor: 0.75
    }
  });
  this.head.position.y = this.headAnchorY = 13;
  this.head.castShadow = true;
  this.head.setRotationAxis(new THREE.Vector3(1, 0, 0));
  this.body.add(this.head);


  this.torso = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(3, 32, 16, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.70),
    materialUniformValues: {
      roughness: 1.0
    },
    config: {
      hairLength: 5,
      hairRadiusBase: 0.5,
      hairRadialSegments: 6,
      gravity: 2,
      fuzz: 0.5,
      minForceFactor: 1.0,
      maxForceFactor: 4.0,
      centrifugalForceFactor: 4,
    }
  });
  this.torso.position.y = this.torsoAnchorY = 9;
  this.body.add(this.torso);


  this.handR = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(1, 12, 12),
    materialUniformValues: {
      roughness: 1.0
    },
    config: {
      hairLength: 2,
      hairRadiusBase: 0.25,
      hairRadialSegments: 6,
      gravity: 2,
      fuzz: 0.25,
    }
  });
  this.handR.position.y = this.handAnchorY = 8;
  this.handR.position.z = this.handAnchorZ = 6;
  this.handR.setRotationAxis(new THREE.Vector3(0, 0, 1));
  this.body.add(this.handR);


  this.handL = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(1, 12, 12),
    materialUniformValues: {
      roughness: 1.0
    },
    config: {
      hairLength: 2,
      hairRadiusBase: 0.25,
      hairRadialSegments: 6,
      gravity: 2,
      fuzz: 0.25,
    }
  });
  this.handL.position.y = this.handAnchorY;
  this.handL.position.z = -this.handAnchorZ;
  this.handL.setRotationAxis(new THREE.Vector3(0, 0, 1));
  this.body.add(this.handL);


  this.legR = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(2, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    materialUniformValues: {
      roughness: 1.0,
      side: THREE.DoubleSide
    },
    config: {
      hairLength: 2,
      hairRadiusBase: 0.5,
      hairRadialSegments: 6,
      gravity: 1,
      fuzz: 0.25,
    }
  });
  this.legR.position.z = this.legAnchorZ = 3;
  this.legR.setRotationAxis(new THREE.Vector3(0, 0, 1));
  this.body.add(this.legR);


  this.legL = new FuzzyMesh({
    geometry: new THREE.SphereGeometry(2, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    materialUniformValues: {
      roughness: 1.0,
      side: THREE.DoubleSide
    },
    config: {
      hairLength: 2,
      hairRadiusBase: 0.5,
      hairRadialSegments: 6,
      gravity: 1,
      fuzz: 0.25,
    }
  });
  this.legL.position.z = -this.legAnchorZ;
  this.legL.setRotationAxis(new THREE.Vector3(0, 0, 1));
  this.body.add(this.legL);


  const color = new THREE.Color().setHSL(Math.random(), 0.75, 0.5);
  this.head.setColor(color);
  this.torso.setColor(color);
  this.handR.setColor(color);
  this.handL.setColor(color);
  this.legR.setColor(color);
  this.legL.setColor(color);
}

Hero.prototype.run = function(){
  var s = 0.125;
  var t = this.runningCycle;
  var amp = 4;

  t = t % (2*Math.PI);

  this.runningCycle += s;

  this.head.setPosition(new THREE.Vector3(
    this.head.position.x,
    this.headAnchorY - Math.cos(  t * 2 ) * amp * .3,
    this.head.position.z
  ));
  this.head.setRotationAngle(Math.cos(t) * amp * .02);

  this.torso.setPosition(new THREE.Vector3(
    this.torso.position.x,
    this.torsoAnchorY - Math.cos(  t * 2 ) * amp * .2,
    this.torso.position.z
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

  this.legR.setPosition(new THREE.Vector3(
    Math.cos(t) * amp,
    Math.max(0, -Math.sin(t) * amp),
    this.legAnchorZ
  ));

  this.legL.setPosition(new THREE.Vector3(
    Math.cos(t + Math.PI) * amp,
    Math.max(0, -Math.sin(t + Math.PI) * amp),
    -this.legAnchorZ
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

root.renderer.setClearColor(0xf1f1f1);
root.controls.autoRotate = true;
root.controls.autoRotateSpeed = -6;
root.camera.position.set(30, 10, 30);
root.scene.fog = new THREE.FogExp2(0xf1f1f1, 0.01);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 1, 0);
root.add(light);

const light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.set(0, -1, 0);
root.add(light2);

root.add(new THREE.AmbientLight(0xaaaaaa));

const hero = new Hero();
hero.mesh.position.y = -8;
root.add(hero.mesh);

root.addUpdateCallback(() => {
  hero.run();
});

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshBasicMaterial({
    color: 0xcccccc
  })
);
floor.position.y = -8;
floor.rotation.x = -Math.PI * 0.5;
root.add(floor);

