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
  antialias: true
});

root.renderer.shadowMap.enabled = true;
root.renderer.setClearColor(0xf1f1f1);
root.camera.position.set(20, 10, 40);

const light = new THREE.DirectionalLight(0xffffff, 0.5);
light.position.set(0, 1, 0);
root.add(light);

const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
light2.position.set(0, -1, 0);
root.add(light2);

// root.add(new THREE.AmbientLight(colors.purple));


root.add(new THREE.AxisHelper(40));



var brownMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  flatShading: true,
  roughness: 1.0
});

Hero = function() {
  this.runningCycle = 0;
  this.mesh = new THREE.Group();
  this.body = new THREE.Group();
  this.mesh.add(this.body);

  var torsoGeom = new THREE.CubeGeometry(8,8,8, 1);//
  this.torso = new THREE.Mesh(torsoGeom, brownMat);
  this.torso.position.y = 8;
  this.torso.castShadow = true;
  this.body.add(this.torso);

  var handGeom = new THREE.CubeGeometry(3,3,3, 1);
  this.handR = new THREE.Mesh(handGeom, brownMat);
  this.handR.position.z=7;
  this.handR.position.y=8;
  this.body.add(this.handR);

  this.handL = this.handR.clone();
  this.handL.position.z = - this.handR.position.z;
  this.body.add(this.handL);

  var headGeom = new THREE.SphereGeometry(4, 48, 32);

  this.head = new FuzzyMesh({
    geometry: headGeom,
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
  this.body.add(this.head);

  var legGeom = new THREE.CubeGeometry(8,3,5, 1);

  this.legR = new THREE.Mesh(legGeom, brownMat);
  this.legR.position.x = 0;
  this.legR.position.z = 7;
  this.legR.position.y = 0;
  this.legR.castShadow = true;
  this.body.add(this.legR);

  this.legL = this.legR.clone();
  this.legL.position.z = - this.legR.position.z;
  this.legL.castShadow = true;
  this.body.add(this.legL);

  this.body.traverse(function(object) {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
};

Hero.prototype.run = function(){
  var s = 0.1;
  var t = this.runningCycle;

  t = t % (2*Math.PI);

  var amp = 4;
  var disp = .2;

  this.legR.rotation.z = 0;
  this.legR.position.y = 0;
  this.legR.position.x = 0;
  this.legL.rotation.z = 0;
  this.legL.position.y = 0;
  this.legL.position.x = 0;

  this.runningCycle += s;
  this.legR.position.x =  Math.cos(t) * amp;
  this.legR.position.y = - Math.sin(t) * amp;

  this.legL.position.x =  Math.cos(t + Math.PI) * amp;
  this.legL.position.y = - Math.sin(t + Math.PI) * amp;

  this.legL.position.y = Math.max (0, this.legL.position.y);
  this.legR.position.y = Math.max (0, this.legR.position.y);

  this.torso.position.y = 8 - Math.cos(  t * 2 ) * amp * .2;
  // this.head.position.y = 21 - Math.cos(  t * 2 ) * amp * .3;
  this.head.setPosition(new THREE.Vector3(
    this.head.position.x,
    21 - Math.cos(  t * 2 ) * amp * .3,
    this.head.position.z
  ));

  this.torso.rotation.y = -Math.cos( t + Math.PI ) * amp * .05;

  this.handR.position.x = -Math.cos( t ) * amp;
  this.handR.rotation.z = -Math.cos( t ) * Math.PI/8;
  this.handL.position.x = -Math.cos( t + Math.PI) * amp;
  this.handL.rotation.z = -Math.cos( t + Math.PI) * Math.PI/8;

  this.head.rotation.x = Math.cos( t ) * amp * .02;
  this.head.rotation.y =  Math.cos( t ) * amp * .01;

  if (t>Math.PI){
    this.legR.rotation.z = Math.cos(t * 2 + Math.PI/2) * Math.PI/4;
    this.legL.rotation.z = 0;
  } else{
    this.legR.rotation.z = 0;
    this.legL.rotation.z = Math.cos(t * 2 + Math.PI/2) *  Math.PI/4;
  }


  this.head.update();
};


const hero = new Hero();

hero.mesh.position.y = -15;
root.add(hero.mesh);

root.addUpdateCallback(() => {
  hero.run();
});




















// new THREE.JSONLoader().load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/304639/plus.json', (geometry) => {
//   // test shapes, try different ones :D
//   // model = new THREE.SphereGeometry(1, 16, 16);
//   // model = new THREE.PlaneGeometry(40, 10, 200, 40);
//   // model = new THREE.CylinderGeometry(2, 2, 8, 128, 64, true);
//   // model = new THREE.TorusGeometry(8, 1, 128, 256);
//   // model = new THREE.TorusKnotGeometry(2, 0.1, 64, 64, 3, 5);
//
//   const fuzzy = new FuzzyMesh({
//     geometry: geometry,
//     // directions: model.vertices,
//     config: {
//       hairLength: 2,
//       hairRadialSegments: 4,
//       hairRadiusTop: 0.0,
//       hairRadiusBase: 0.1,
//     },
//     materialUniformValues: {
//       roughness: 1.0
//     }
//   });
//   root.add(fuzzy);
//   root.addUpdateCallback(() => {
//     fuzzy.update();
//   });
//
//   const axes = [
//     new THREE.Vector3(1, 0, 0),
//     new THREE.Vector3(0, 1, 0),
//     new THREE.Vector3(0, 0, 1),
//   ];
//
//   const proxy = {
//     position: new THREE.Vector3(),
//     angle: 0,
//   };
//
//   const tl = new TimelineMax({
//     repeat: -1,
//     delay: 1,
//     repeatDelay: 1,
//     onRepeat: () => {
//       fuzzy.setRotationAxis(BAS.Utils.randomAxis());
//       // fuzzy.setRotationAxis(axes[Math.random() * 3 | 0]);
//     },
//     onUpdate: () => {
//       fuzzy.setPosition(proxy.position);
//       fuzzy.setRotationAngle(proxy.angle);
//     }
//   });
//
//   tl.to(proxy.position, 0.5, {y: 8, ease: Power2.easeOut});
//   tl.to(proxy.position, 0.5, {y: 0, ease: Power2.easeIn});
//   tl.to(proxy.position, 0.1, {y: -2, ease: Power2.easeOut});
//   tl.to(proxy.position, 0.5, {y: 0, ease: Power2.easeOut});
//   tl.fromTo(proxy, 1.0, {angle: 0}, {angle: Math.Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1), ease: Power1.easeInOut}, 0);
// });
